using Perdecim.Api.Data;
using Perdecim.Api.DTOs.Products;
using Perdecim.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Perdecim.Api.Services;

public class ProductImageService(AppDbContext dbContext, IWebHostEnvironment environment)
{
    private const long MaxFileSize = 10 * 1024 * 1024;
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    };

    public async Task<(ProductImageDto? Image, string? Error, bool NotFound)> UploadImageAsync(
        int productId,
        IFormFile file,
        bool isMainImage,
        int? displayOrder,
        CancellationToken cancellationToken)
    {
        if (!await dbContext.Products.AnyAsync(product => product.Id == productId, cancellationToken))
        {
            return (null, null, true);
        }

        var validationError = ValidateFile(file);
        if (validationError is not null)
        {
            return (null, validationError, false);
        }

        var existingImages = await dbContext.ProductImages
            .Where(image => image.ProductId == productId)
            .ToListAsync(cancellationToken);

        var shouldBeMainImage = isMainImage || existingImages.Count == 0;
        if (shouldBeMainImage)
        {
            foreach (var image in existingImages)
            {
                image.IsMainImage = false;
            }
        }

        var extension = Path.GetExtension(file.FileName);
        var fileName = $"{productId}-{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var uploadDirectory = GetUploadDirectory();
        Directory.CreateDirectory(uploadDirectory);

        var filePath = Path.Combine(uploadDirectory, fileName);
        await using (var stream = File.Create(filePath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var imageEntity = new ProductImage
        {
            ProductId = productId,
            ImageUrl = $"/uploads/products/{fileName}",
            IsMainImage = shouldBeMainImage,
            DisplayOrder = displayOrder ?? GetNextDisplayOrder(existingImages)
        };

        dbContext.ProductImages.Add(imageEntity);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            File.Delete(filePath);
            throw;
        }

        return (ToDto(imageEntity), null, false);
    }

    public async Task<(bool Deleted, bool ProductNotFound)> DeleteImageAsync(
        int productId,
        int imageId,
        CancellationToken cancellationToken)
    {
        if (!await dbContext.Products.AnyAsync(product => product.Id == productId, cancellationToken))
        {
            return (false, true);
        }

        var image = await dbContext.ProductImages
            .FirstOrDefaultAsync(item => item.ProductId == productId && item.Id == imageId, cancellationToken);

        if (image is null)
        {
            return (false, false);
        }

        var wasMainImage = image.IsMainImage;
        dbContext.ProductImages.Remove(image);

        if (wasMainImage)
        {
            var replacement = await dbContext.ProductImages
                .Where(item => item.ProductId == productId && item.Id != imageId)
                .OrderBy(item => item.DisplayOrder)
                .FirstOrDefaultAsync(cancellationToken);

            if (replacement is not null)
            {
                replacement.IsMainImage = true;
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        DeleteLocalFile(image.ImageUrl);

        return (true, false);
    }

    private static string? ValidateFile(IFormFile file)
    {
        if (file.Length == 0)
        {
            return "Image file is required.";
        }

        if (file.Length > MaxFileSize)
        {
            return "Image file must be 10 MB or smaller.";
        }

        var extension = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(extension))
        {
            return "Only JPG, PNG, and WebP images are supported.";
        }

        return null;
    }

    private string GetUploadDirectory()
    {
        var webRootPath = environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRootPath))
        {
            webRootPath = Path.Combine(environment.ContentRootPath, "wwwroot");
        }

        return Path.Combine(webRootPath, "uploads", "products");
    }

    private void DeleteLocalFile(string imageUrl)
    {
        var fileName = Path.GetFileName(imageUrl);
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return;
        }

        var filePath = Path.Combine(GetUploadDirectory(), fileName);
        if (File.Exists(filePath))
        {
            File.Delete(filePath);
        }
    }

    private static int GetNextDisplayOrder(IReadOnlyCollection<ProductImage> existingImages)
    {
        return existingImages.Count == 0 ? 0 : existingImages.Max(image => image.DisplayOrder) + 1;
    }

    private static ProductImageDto ToDto(ProductImage image)
    {
        return new ProductImageDto
        {
            Id = image.Id,
            Url = image.ImageUrl,
            IsMainImage = image.IsMainImage,
            DisplayOrder = image.DisplayOrder
        };
    }
}

