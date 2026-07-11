using Perdecim.Api.Data;
using Perdecim.Api.DTOs;
using Perdecim.Api.DTOs.Products;
using Perdecim.Api.Entities;
using Perdecim.Api.Helpers;
using Microsoft.EntityFrameworkCore;

namespace Perdecim.Api.Services;

public class ProductService(AppDbContext dbContext)
{
    public async Task<PagedResult<ProductListDto>> GetProductsAsync(
        ProductQueryParams queryParams,
        CancellationToken cancellationToken)
    {
        var query = BuildFilteredQuery(queryParams).AsNoTracking();
        var totalCount = await query.CountAsync(cancellationToken);

        var products = await ApplySorting(query, queryParams.SortBy)
            .Skip((queryParams.Page - 1) * queryParams.PageSize)
            .Take(queryParams.PageSize)
            .Select(product => new ProductListDto
            {
                Id = product.Id,
                Name = product.Name,
                Code = product.Code,
                Price = product.Price,
                DiscountPrice = product.DiscountPrice,
                IsDiscounted = product.IsDiscounted,
                IsAvailable = product.IsAvailable,
                IsFeatured = product.IsFeatured,
                MainImageUrl = product.Images
                    .OrderByDescending(image => image.IsMainImage)
                    .ThenBy(image => image.DisplayOrder)
                    .Select(image => image.ImageUrl)
                    .FirstOrDefault(),
                Category = product.Category == null ? string.Empty : product.Category.Name,
                Colors = product.ProductColors
                    .OrderBy(productColor => productColor.Color!.Name)
                    .Select(productColor => productColor.Color!.Name)
                    .ToList(),
                Sizes = product.ProductSizes
                    .OrderBy(productSize => productSize.Size!.Name)
                    .Select(productSize => productSize.Size!.Name)
                    .ToList()
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<ProductListDto>
        {
            Items = products,
            Page = queryParams.Page,
            PageSize = queryParams.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<ProductDetailDto?> GetProductByIdAsync(int id, CancellationToken cancellationToken)
    {
        return await dbContext.Products
            .AsNoTracking()
            .Where(product => product.Id == id)
            .Select(product => new ProductDetailDto
            {
                Id = product.Id,
                Name = product.Name,
                Code = product.Code,
                Description = product.Description,
                Price = product.Price,
                DiscountPrice = product.DiscountPrice,
                IsDiscounted = product.IsDiscounted,
                IsAvailable = product.IsAvailable,
                IsFeatured = product.IsFeatured,
                Category = product.Category == null ? string.Empty : product.Category.Name,
                Style = product.Style == null ? null : product.Style.Name,
                Material = product.Material == null ? null : product.Material.Name,
                Colors = product.ProductColors
                    .OrderBy(productColor => productColor.Color!.Name)
                    .Select(productColor => productColor.Color!.Name)
                    .ToList(),
                Sizes = product.ProductSizes
                    .OrderBy(productSize => productSize.Size!.Name)
                    .Select(productSize => new ProductSizeDto
                    {
                        Name = productSize.Size!.Name,
                        StockQuantity = productSize.StockQuantity
                    })
                    .ToList(),
                Images = product.Images
                    .OrderByDescending(image => image.IsMainImage)
                    .ThenBy(image => image.DisplayOrder)
                    .Select(image => new ProductImageDto
                    {
                        Id = image.Id,
                        Url = image.ImageUrl,
                        IsMainImage = image.IsMainImage,
                        DisplayOrder = image.DisplayOrder
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<(ProductDetailDto? Product, string? Error)> CreateProductAsync(
        CreateProductDto dto,
        CancellationToken cancellationToken)
    {
        var validationError = await ValidateProductReferencesAsync(dto.Code, null, dto.CategoryId, dto.StyleId, dto.MaterialId, dto.ColorIds, dto.Sizes, cancellationToken);
        if (validationError is not null)
        {
            return (null, validationError);
        }

        var product = new Product
        {
            Name = dto.Name.Trim(),
            Code = dto.Code.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            CategoryId = dto.CategoryId,
            StyleId = dto.StyleId,
            MaterialId = dto.MaterialId,
            Price = dto.Price,
            DiscountPrice = dto.DiscountPrice,
            IsDiscounted = dto.IsDiscounted,
            IsAvailable = dto.IsAvailable,
            IsFeatured = dto.IsFeatured,
            CreatedAt = DateTime.UtcNow,
            ProductColors = dto.ColorIds.Distinct().Select(colorId => new ProductColor { ColorId = colorId }).ToList(),
            ProductSizes = dto.Sizes
                .GroupBy(size => size.SizeId)
                .Select(group => new ProductSize
                {
                    SizeId = group.Key,
                    StockQuantity = group.Sum(size => size.StockQuantity)
                })
                .ToList()
        };

        dbContext.Products.Add(product);
        await dbContext.SaveChangesAsync(cancellationToken);

        return (await GetProductByIdAsync(product.Id, cancellationToken), null);
    }

    public async Task<(ProductDetailDto? Product, string? Error)> UpdateProductAsync(
        int id,
        UpdateProductDto dto,
        CancellationToken cancellationToken)
    {
        var product = await dbContext.Products
            .Include(existingProduct => existingProduct.ProductColors)
            .Include(existingProduct => existingProduct.ProductSizes)
            .FirstOrDefaultAsync(existingProduct => existingProduct.Id == id, cancellationToken);

        if (product is null)
        {
            return (null, null);
        }

        var validationError = await ValidateProductReferencesAsync(dto.Code, id, dto.CategoryId, dto.StyleId, dto.MaterialId, dto.ColorIds, dto.Sizes, cancellationToken);
        if (validationError is not null)
        {
            return (null, validationError);
        }

        product.Name = dto.Name.Trim();
        product.Code = dto.Code.Trim();
        product.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        product.CategoryId = dto.CategoryId;
        product.StyleId = dto.StyleId;
        product.MaterialId = dto.MaterialId;
        product.Price = dto.Price;
        product.DiscountPrice = dto.DiscountPrice;
        product.IsDiscounted = dto.IsDiscounted;
        product.IsAvailable = dto.IsAvailable;
        product.IsFeatured = dto.IsFeatured;
        product.UpdatedAt = DateTime.UtcNow;

        product.ProductColors.Clear();
        foreach (var colorId in dto.ColorIds.Distinct())
        {
            product.ProductColors.Add(new ProductColor { ProductId = id, ColorId = colorId });
        }

        product.ProductSizes.Clear();
        foreach (var size in dto.Sizes.GroupBy(size => size.SizeId))
        {
            product.ProductSizes.Add(new ProductSize
            {
                ProductId = id,
                SizeId = size.Key,
                StockQuantity = size.Sum(item => item.StockQuantity)
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return (await GetProductByIdAsync(id, cancellationToken), null);
    }

    public async Task<bool> DeleteProductAsync(int id, CancellationToken cancellationToken)
    {
        var product = await dbContext.Products.FindAsync([id], cancellationToken);
        if (product is null)
        {
            return false;
        }

        dbContext.Products.Remove(product);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private IQueryable<Product> BuildFilteredQuery(ProductQueryParams queryParams)
    {
        var query = dbContext.Products.AsQueryable();

        if (queryParams.CategoryId is not null)
        {
            query = query.Where(product => product.CategoryId == queryParams.CategoryId);
        }

        if (queryParams.ColorId is not null)
        {
            query = query.Where(product => product.ProductColors.Any(productColor => productColor.ColorId == queryParams.ColorId));
        }

        if (queryParams.SizeId is not null)
        {
            query = query.Where(product => product.ProductSizes.Any(productSize => productSize.SizeId == queryParams.SizeId));
        }

        if (queryParams.StyleId is not null)
        {
            query = query.Where(product => product.StyleId == queryParams.StyleId);
        }

        if (queryParams.MaterialId is not null)
        {
            query = query.Where(product => product.MaterialId == queryParams.MaterialId);
        }

        if (queryParams.MinPrice is not null)
        {
            query = query.Where(product => product.Price >= queryParams.MinPrice);
        }

        if (queryParams.MaxPrice is not null)
        {
            query = query.Where(product => product.Price <= queryParams.MaxPrice);
        }

        if (queryParams.IsDiscounted is not null)
        {
            query = query.Where(product => product.IsDiscounted == queryParams.IsDiscounted);
        }

        if (queryParams.IsAvailable is not null)
        {
            query = query.Where(product => product.IsAvailable == queryParams.IsAvailable);
        }

        if (queryParams.IsFeatured is not null)
        {
            query = query.Where(product => product.IsFeatured == queryParams.IsFeatured);
        }

        if (!string.IsNullOrWhiteSpace(queryParams.Search))
        {
            var search = queryParams.Search.Trim();
            query = query.Where(product =>
                product.Name.Contains(search) ||
                product.Code.Contains(search) ||
                (product.Description != null && product.Description.Contains(search)));
        }

        return query;
    }

    private static IQueryable<Product> ApplySorting(IQueryable<Product> query, string? sortBy)
    {
        return sortBy?.Trim().ToLowerInvariant() switch
        {
            "priceasc" => query.OrderBy(product => product.Price),
            "pricedesc" => query.OrderByDescending(product => product.Price),
            "discounted" => query.OrderByDescending(product => product.IsDiscounted).ThenByDescending(product => product.CreatedAt),
            "featured" => query.OrderByDescending(product => product.IsFeatured).ThenByDescending(product => product.CreatedAt),
            _ => query.OrderByDescending(product => product.CreatedAt)
        };
    }

    private async Task<string?> ValidateProductReferencesAsync(
        string code,
        int? existingProductId,
        int categoryId,
        int? styleId,
        int? materialId,
        IReadOnlyList<int> colorIds,
        IReadOnlyList<ProductSizeInputDto> sizes,
        CancellationToken cancellationToken)
    {
        var normalizedCode = code.Trim();
        var codeExists = await dbContext.Products.AnyAsync(
            product => product.Code == normalizedCode && product.Id != existingProductId,
            cancellationToken);

        if (codeExists)
        {
            return "A product with this code already exists.";
        }

        if (!await dbContext.Categories.AnyAsync(category => category.Id == categoryId, cancellationToken))
        {
            return "Category does not exist.";
        }

        if (styleId is not null && !await dbContext.Styles.AnyAsync(style => style.Id == styleId, cancellationToken))
        {
            return "Style does not exist.";
        }

        if (materialId is not null && !await dbContext.Materials.AnyAsync(material => material.Id == materialId, cancellationToken))
        {
            return "Material does not exist.";
        }

        var distinctColorIds = colorIds.Distinct().ToList();
        var existingColorCount = await dbContext.Colors.CountAsync(color => distinctColorIds.Contains(color.Id), cancellationToken);
        if (existingColorCount != distinctColorIds.Count)
        {
            return "One or more colors do not exist.";
        }

        var distinctSizeIds = sizes.Select(size => size.SizeId).Distinct().ToList();
        var existingSizeCount = await dbContext.Sizes.CountAsync(size => distinctSizeIds.Contains(size.Id), cancellationToken);
        if (existingSizeCount != distinctSizeIds.Count)
        {
            return "One or more sizes do not exist.";
        }

        return null;
    }
}

