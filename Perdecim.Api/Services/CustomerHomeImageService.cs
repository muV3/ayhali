using Microsoft.EntityFrameworkCore;
using Perdecim.Api.Data;
using Perdecim.Api.DTOs.CustomerHomeImages;
using Perdecim.Api.Entities;

namespace Perdecim.Api.Services;

public class CustomerHomeImageService(
    AppDbContext dbContext,
    ProductImageService productImageService)
{
    public const int MaximumFavoriteCount = 10;

    public async Task<IReadOnlyList<CustomerHomeImageDto>> GetAllAsync(
        bool favoritesOnly,
        CancellationToken cancellationToken)
    {
        var query = dbContext.CustomerHomeImages
            .AsNoTracking()
            .OrderBy(image => image.DisplayOrder)
            .ThenBy(image => image.Id)
            .AsQueryable();

        if (favoritesOnly)
        {
            query = query
                .Where(image => image.IsFavorite)
                .Take(MaximumFavoriteCount);
        }

        var images = await query.ToListAsync(cancellationToken);

        return images.Select(ToDto).ToList();
    }

    public async Task<(CustomerHomeImageDto? Image, string? Error)> UploadAsync(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        var existingImages = await dbContext.CustomerHomeImages
            .OrderBy(image => image.DisplayOrder)
            .ToListAsync(cancellationToken);

        var (imageUrl, savedImageUrls, error) = await productImageService.UploadCustomerHomeImageAsync(
            file,
            cancellationToken);
        if (error is not null)
        {
            return (null, error);
        }

        var image = new CustomerHomeImage
        {
            ImageUrl = imageUrl!,
            DisplayOrder = existingImages.Count == 0 ? 0 : existingImages.Max(item => item.DisplayOrder) + 1,
            IsFavorite = false,
            CreatedAt = DateTime.UtcNow
        };
        dbContext.CustomerHomeImages.Add(image);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await productImageService.DeleteStoredFilesAsync(savedImageUrls, cancellationToken);
            throw;
        }

        return (ToDto(image), null);
    }

    public async Task<(IReadOnlyList<CustomerHomeImageDto>? Images, string? Error)> ReorderAsync(
        IReadOnlyList<int>? imageIds,
        CancellationToken cancellationToken)
    {
        var images = await dbContext.CustomerHomeImages.ToListAsync(cancellationToken);
        if (imageIds is null || !IsValidOrder(imageIds, images.Select(image => image.Id).ToList()))
        {
            return (null, "Görsel sıralaması güncel galeriyle eşleşmiyor.");
        }

        var imagesById = images.ToDictionary(image => image.Id);
        for (var index = 0; index < imageIds.Count; index++)
        {
            var image = imagesById[imageIds[index]];
            image.DisplayOrder = index;
            image.UpdatedAt = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return (await GetAllAsync(false, cancellationToken), null);
    }

    public async Task<(CustomerHomeImageDto? Image, string? Error, bool NotFound)> SetFavoriteAsync(
        int id,
        bool isFavorite,
        CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        await dbContext.Database.ExecuteSqlRawAsync(
            """LOCK TABLE "CustomerHomeImages" IN SHARE ROW EXCLUSIVE MODE;""",
            cancellationToken);

        var image = await dbContext.CustomerHomeImages.FindAsync([id], cancellationToken);
        if (image is null)
        {
            return (null, null, true);
        }

        if (isFavorite && !image.IsFavorite)
        {
            var favoriteCount = await dbContext.CustomerHomeImages
                .CountAsync(item => item.IsFavorite, cancellationToken);
            if (!CanFavorite(favoriteCount, image.IsFavorite))
            {
                return (null, $"Ana sayfada en fazla {MaximumFavoriteCount} favori görsel gösterilebilir.", false);
            }
        }

        image.IsFavorite = isFavorite;
        image.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return (ToDto(image), null, false);
    }

    internal static bool CanFavorite(int existingFavoriteCount, bool alreadyFavorite)
    {
        return alreadyFavorite || existingFavoriteCount < MaximumFavoriteCount;
    }

    internal static bool IsValidOrder(
        IReadOnlyList<int> requestedIds,
        IReadOnlyCollection<int> existingIds)
    {
        return requestedIds.Count == existingIds.Count
            && requestedIds.Distinct().Count() == requestedIds.Count
            && requestedIds.ToHashSet().SetEquals(existingIds);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var image = await dbContext.CustomerHomeImages.FindAsync([id], cancellationToken);
        if (image is null)
        {
            return false;
        }

        var imageUrl = image.ImageUrl;
        var removedOrder = image.DisplayOrder;
        dbContext.CustomerHomeImages.Remove(image);

        var followingImages = await dbContext.CustomerHomeImages
            .Where(item => item.Id != id && item.DisplayOrder > removedOrder)
            .ToListAsync(cancellationToken);
        foreach (var followingImage in followingImages)
        {
            followingImage.DisplayOrder--;
            followingImage.UpdatedAt = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await productImageService.DeleteStoredFilesAsync([imageUrl], cancellationToken);
        return true;
    }

    private static CustomerHomeImageDto ToDto(CustomerHomeImage image)
    {
        return new CustomerHomeImageDto
        {
            Id = image.Id,
            ImageUrl = image.ImageUrl,
            DisplayOrder = image.DisplayOrder,
            IsFavorite = image.IsFavorite
        };
    }
}
