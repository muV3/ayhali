using Microsoft.EntityFrameworkCore;
using Perdecim.Api.Data;
using Perdecim.Api.DTOs.FabricSampleBooks;
using Perdecim.Api.Entities;

namespace Perdecim.Api.Services;

public class FabricSampleBookService(
    AppDbContext dbContext,
    ProductImageService productImageService)
{
    public async Task<IReadOnlyList<FabricSampleBookDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await dbContext.FabricSampleBooks
            .AsNoTracking()
            .OrderBy(sampleBook => sampleBook.Name)
            .Select(sampleBook => new FabricSampleBookDto
            {
                Id = sampleBook.Id,
                Name = sampleBook.Name,
                ImageUrl = sampleBook.ImageUrl,
                ProductCount = sampleBook.Products.Count
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<FabricSampleBookDto?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        return await dbContext.FabricSampleBooks
            .AsNoTracking()
            .Where(sampleBook => sampleBook.Id == id)
            .Select(sampleBook => new FabricSampleBookDto
            {
                Id = sampleBook.Id,
                Name = sampleBook.Name,
                ImageUrl = sampleBook.ImageUrl,
                ProductCount = sampleBook.Products.Count
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<(FabricSampleBookDto? SampleBook, string? Error)> CreateAsync(
        string name,
        CancellationToken cancellationToken)
    {
        var normalizedName = name.Trim();
        if (await NameExistsAsync(normalizedName, null, cancellationToken))
        {
            return (null, "Bu adla bir kartela zaten mevcut.");
        }

        var sampleBook = new FabricSampleBook
        {
            Name = normalizedName,
            CreatedAt = DateTime.UtcNow
        };
        dbContext.FabricSampleBooks.Add(sampleBook);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(sampleBook.Id, cancellationToken), null);
    }

    public async Task<(FabricSampleBookDto? SampleBook, string? Error, bool NotFound)> UpdateAsync(
        int id,
        string name,
        CancellationToken cancellationToken)
    {
        var sampleBook = await dbContext.FabricSampleBooks.FindAsync([id], cancellationToken);
        if (sampleBook is null)
        {
            return (null, null, true);
        }

        var normalizedName = name.Trim();
        if (await NameExistsAsync(normalizedName, id, cancellationToken))
        {
            return (null, "Bu adla bir kartela zaten mevcut.", false);
        }

        sampleBook.Name = normalizedName;
        sampleBook.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(id, cancellationToken), null, false);
    }

    public async Task<(FabricSampleBookDto? SampleBook, string? Error, bool NotFound)> UploadImageAsync(
        int id,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        var sampleBook = await dbContext.FabricSampleBooks.FindAsync([id], cancellationToken);
        if (sampleBook is null)
        {
            return (null, null, true);
        }

        var (imageUrl, error) = await productImageService.UploadSampleBookImageAsync(id, file, cancellationToken);
        if (error is not null)
        {
            return (null, error, false);
        }

        var oldImageUrl = sampleBook.ImageUrl;
        sampleBook.ImageUrl = imageUrl;
        sampleBook.UpdatedAt = DateTime.UtcNow;
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await productImageService.DeleteStoredFilesAsync([imageUrl!], cancellationToken);
            throw;
        }

        if (oldImageUrl is not null)
        {
            await productImageService.DeleteStoredFilesAsync([oldImageUrl], cancellationToken);
        }

        return (await GetByIdAsync(id, cancellationToken), null, false);
    }

    public async Task<(bool Deleted, bool NotFound)> DeleteImageAsync(int id, CancellationToken cancellationToken)
    {
        var sampleBook = await dbContext.FabricSampleBooks.FindAsync([id], cancellationToken);
        if (sampleBook is null)
        {
            return (false, true);
        }

        if (sampleBook.ImageUrl is null)
        {
            return (false, false);
        }

        var imageUrl = sampleBook.ImageUrl;
        sampleBook.ImageUrl = null;
        sampleBook.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        await productImageService.DeleteStoredFilesAsync([imageUrl], cancellationToken);
        return (true, false);
    }

    public async Task<(bool Deleted, bool InUse, bool NotFound)> DeleteAsync(
        int id,
        CancellationToken cancellationToken)
    {
        var sampleBook = await dbContext.FabricSampleBooks
            .Include(item => item.Products)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (sampleBook is null)
        {
            return (false, false, true);
        }

        if (sampleBook.Products.Count > 0)
        {
            return (false, true, false);
        }

        var imageUrl = sampleBook.ImageUrl;
        dbContext.FabricSampleBooks.Remove(sampleBook);
        await dbContext.SaveChangesAsync(cancellationToken);
        if (imageUrl is not null)
        {
            await productImageService.DeleteStoredFilesAsync([imageUrl], cancellationToken);
        }

        return (true, false, false);
    }

    private Task<bool> NameExistsAsync(string name, int? excludedId, CancellationToken cancellationToken)
    {
        return dbContext.FabricSampleBooks.AnyAsync(
            sampleBook => sampleBook.Name == name && sampleBook.Id != excludedId,
            cancellationToken);
    }
}
