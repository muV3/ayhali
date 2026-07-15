using Perdecim.Api.Data;
using Perdecim.Api.DTOs.Products;
using Perdecim.Api.Entities;
using Perdecim.Api.Options;
using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Net;

namespace Perdecim.Api.Services;

public class ProductImageService(
    AppDbContext dbContext,
    IWebHostEnvironment environment,
    IOptions<StorageOptions> storageOptions,
    ILogger<ProductImageService> logger)
{
    private const long MaxFileSize = 10 * 1024 * 1024;
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    };

    public async Task<(Stream? Content, string? ContentType)> GetImageAsync(
        string objectKey,
        CancellationToken cancellationToken)
    {
        if (!IsAllowedProductObjectKey(objectKey))
        {
            return (null, null);
        }

        var imageRoute = BuildImageRoute(objectKey);
        if (!await dbContext.ProductImages
                .AsNoTracking()
                .AnyAsync(image => image.ImageUrl == imageRoute, cancellationToken))
        {
            return (null, null);
        }

        if (storageOptions.Value.UseS3)
        {
            try
            {
                using var client = CreateS3Client(storageOptions.Value);
                var response = await client.GetObjectAsync(
                    storageOptions.Value.BucketName,
                    objectKey,
                    cancellationToken);

                return (response.ResponseStream, GetContentType(objectKey));
            }
            catch (AmazonS3Exception exception) when (exception.StatusCode == HttpStatusCode.NotFound)
            {
                return (null, null);
            }
        }

        var filePath = Path.Combine(GetUploadDirectory(), Path.GetFileName(objectKey));
        if (!File.Exists(filePath))
        {
            return (null, null);
        }

        return (File.OpenRead(filePath), GetContentType(filePath));
    }

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

        var validationError = await ValidateFileAsync(file, cancellationToken);
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
        var imageUrl = await SaveFileAsync(file, fileName, cancellationToken);

        var imageEntity = new ProductImage
        {
            ProductId = productId,
            ImageUrl = imageUrl,
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
            await DeleteStoredFilesAsync([imageUrl], cancellationToken);
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
        await DeleteStoredFilesAsync([image.ImageUrl], cancellationToken);

        return (true, false);
    }

    public async Task<bool> SetMainImageAsync(
        int productId,
        int imageId,
        CancellationToken cancellationToken)
    {
        var images = await dbContext.ProductImages
            .Where(image => image.ProductId == productId)
            .ToListAsync(cancellationToken);

        var selectedImage = images.FirstOrDefault(image => image.Id == imageId);
        if (selectedImage is null)
        {
            return false;
        }

        foreach (var image in images)
        {
            image.IsMainImage = image.Id == imageId;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static async Task<string?> ValidateFileAsync(
        IFormFile file,
        CancellationToken cancellationToken)
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

        var header = new byte[12];
        await using var stream = file.OpenReadStream();
        var bytesRead = await stream.ReadAsync(header, cancellationToken);
        if (!HasExpectedImageSignature(extension, header.AsSpan(0, bytesRead)))
        {
            return "The file content does not match its image extension.";
        }

        return null;
    }

    internal static bool HasExpectedImageSignature(string extension, ReadOnlySpan<byte> header)
    {
        return extension.ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => header.Length >= 3
                && header[0] == 0xFF
                && header[1] == 0xD8
                && header[2] == 0xFF,
            ".png" => header.Length >= 8
                && header[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
            ".webp" => header.Length >= 12
                && header[..4].SequenceEqual("RIFF"u8)
                && header[8..12].SequenceEqual("WEBP"u8),
            _ => false
        };
    }

    private async Task<string> SaveFileAsync(IFormFile file, string fileName, CancellationToken cancellationToken)
    {
        if (storageOptions.Value.UseS3)
        {
            return await SaveS3FileAsync(file, fileName, cancellationToken);
        }

        return await SaveLocalFileAsync(file, fileName, cancellationToken);
    }

    private async Task<string> SaveLocalFileAsync(IFormFile file, string fileName, CancellationToken cancellationToken)
    {
        var uploadDirectory = GetUploadDirectory();
        Directory.CreateDirectory(uploadDirectory);

        var filePath = Path.Combine(uploadDirectory, fileName);
        await using var stream = File.Create(filePath);
        await file.CopyToAsync(stream, cancellationToken);

        return BuildImageRoute(BuildObjectKey(fileName));
    }

    private async Task<string> SaveS3FileAsync(IFormFile file, string fileName, CancellationToken cancellationToken)
    {
        var options = storageOptions.Value;
        var objectKey = BuildObjectKey(fileName);

        await using var stream = file.OpenReadStream();
        using var client = CreateS3Client(options);

        await client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = options.BucketName,
            Key = objectKey,
            InputStream = stream,
            ContentType = GetContentType(fileName),
            AutoCloseStream = false
        }, cancellationToken);

        return BuildImageRoute(objectKey);
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

    private async Task DeleteStoredFileAsync(string imageUrl, CancellationToken cancellationToken)
    {
        if (storageOptions.Value.UseS3)
        {
            await DeleteS3FileAsync(imageUrl, cancellationToken);
            return;
        }

        DeleteLocalFile(imageUrl);
    }

    public async Task DeleteStoredFilesAsync(
        IEnumerable<string> imageUrls,
        CancellationToken cancellationToken)
    {
        foreach (var imageUrl in imageUrls)
        {
            try
            {
                await DeleteStoredFileAsync(imageUrl, cancellationToken);
            }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "Failed to remove a product image from storage.");
            }
        }
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

    private async Task DeleteS3FileAsync(string imageUrl, CancellationToken cancellationToken)
    {
        var options = storageOptions.Value;
        var objectKey = GetObjectKeyFromUrl(imageUrl);
        if (string.IsNullOrWhiteSpace(objectKey))
        {
            return;
        }

        using var client = CreateS3Client(options);
        await client.DeleteObjectAsync(options.BucketName, objectKey, cancellationToken);
    }

    private static AmazonS3Client CreateS3Client(StorageOptions options)
    {
        var credentials = new BasicAWSCredentials(options.AccessKeyId, options.SecretAccessKey);
        var config = new AmazonS3Config
        {
            ForcePathStyle = true,
            RegionEndpoint = RegionEndpoint.GetBySystemName(options.Region)
        };

        if (!string.IsNullOrWhiteSpace(options.Endpoint))
        {
            config.ServiceURL = options.Endpoint;
        }

        return new AmazonS3Client(credentials, config);
    }

    private string BuildObjectKey(string fileName)
    {
        var prefix = storageOptions.Value.ProductImagePrefix.Trim('/');
        return string.IsNullOrWhiteSpace(prefix) ? fileName : $"{prefix}/{fileName}";
    }

    private static string BuildImageRoute(string objectKey)
    {
        return $"/api/product-images/{objectKey}";
    }

    private string? GetObjectKeyFromUrl(string imageUrl)
    {
        var prefix = storageOptions.Value.ProductImagePrefix.Trim('/');
        if (Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri))
        {
            return GetObjectKeyFromPath(uri.AbsolutePath);
        }

        return GetObjectKeyFromPath(imageUrl);
    }

    private string? GetObjectKeyFromPath(string path)
    {
        const string imageRoutePrefix = "/api/product-images/";
        if (path.StartsWith(imageRoutePrefix, StringComparison.OrdinalIgnoreCase))
        {
            return path[imageRoutePrefix.Length..].TrimStart('/');
        }

        var fileName = Path.GetFileName(path);
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return null;
        }

        var prefix = storageOptions.Value.ProductImagePrefix.Trim('/');
        return string.IsNullOrWhiteSpace(prefix) ? fileName : $"{prefix}/{fileName}";
    }

    private bool IsAllowedProductObjectKey(string objectKey)
    {
        var prefix = storageOptions.Value.ProductImagePrefix.Trim('/');
        return !string.IsNullOrWhiteSpace(objectKey)
            && !objectKey.Contains("..", StringComparison.Ordinal)
            && !objectKey.Contains('\\')
            && !Path.IsPathRooted(objectKey)
            && objectKey.StartsWith($"{prefix}/", StringComparison.Ordinal);
    }

    private static string GetContentType(string filePath)
    {
        return Path.GetExtension(filePath).ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };
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

