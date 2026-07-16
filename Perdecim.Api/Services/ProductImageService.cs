using Perdecim.Api.Data;
using Perdecim.Api.DTOs.Products;
using Perdecim.Api.Entities;
using Perdecim.Api.Helpers;
using Perdecim.Api.Options;
using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using System.Net;

namespace Perdecim.Api.Services;

public class ProductImageService(
    AppDbContext dbContext,
    IWebHostEnvironment environment,
    IOptions<StorageOptions> storageOptions,
    ILogger<ProductImageService> logger)
{
    private const long MaxFileSize = 10 * 1024 * 1024;
    private const long MaxPixelCount = 40_000_000;
    private const int MaxDimension = 12_000;
    private const int WebpQuality = 84;
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
        if (!IsAllowedCatalogObjectKey(objectKey))
        {
            return (null, null);
        }

        var imageRoute = BuildImageRoute(objectKey);
        var variantFamilyPrefix = ProductImageVariants.GetVariantFamilyPrefix(imageRoute);
        var sampleBookPrefix = storageOptions.Value.SampleBookImagePrefix.Trim('/');
        var isSampleBookImage = objectKey.StartsWith($"{sampleBookPrefix}/", StringComparison.Ordinal);
        var imageExists = isSampleBookImage
            ? variantFamilyPrefix is null
                ? await dbContext.FabricSampleBooks.AsNoTracking().AnyAsync(book => book.ImageUrl == imageRoute, cancellationToken)
                : await dbContext.FabricSampleBooks.AsNoTracking().AnyAsync(
                    book => book.ImageUrl != null && book.ImageUrl.StartsWith(variantFamilyPrefix) && book.ImageUrl.EndsWith(".webp"),
                    cancellationToken)
            : variantFamilyPrefix is null
                ? await dbContext.ProductImages.AsNoTracking().AnyAsync(image => image.ImageUrl == imageRoute, cancellationToken)
                : await dbContext.ProductImages.AsNoTracking().AnyAsync(
                    image => image.ImageUrl.StartsWith(variantFamilyPrefix) && image.ImageUrl.EndsWith(".webp"),
                    cancellationToken);

        if (!imageExists)
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

        var imageStem = $"{productId}-{Guid.NewGuid():N}";
        var (imageUrl, savedImageUrls, processingError) = await StoreOptimizedImageAsync(
            file,
            imageStem,
            storageOptions.Value.ProductImagePrefix,
            cancellationToken);
        if (processingError is not null)
        {
            return (null, processingError, false);
        }

        var imageEntity = new ProductImage
        {
            ProductId = productId,
            ImageUrl = imageUrl!,
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
            await DeleteStoredFilesAsync(savedImageUrls, cancellationToken);
            throw;
        }

        return (ToDto(imageEntity), null, false);
    }

    public async Task<(string? ImageUrl, string? Error)> UploadSampleBookImageAsync(
        int sampleBookId,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        var validationError = await ValidateFileAsync(file, cancellationToken);
        if (validationError is not null)
        {
            return (null, validationError);
        }

        var (imageUrl, _, processingError) = await StoreOptimizedImageAsync(
            file,
            $"{sampleBookId}-{Guid.NewGuid():N}",
            storageOptions.Value.SampleBookImagePrefix,
            cancellationToken);

        return (imageUrl, processingError);
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

    internal static async Task<(IReadOnlyList<ProcessedImageVariant>? Variants, string? Error)> CreateWebpVariantsAsync(
        IFormFile file,
        string imageStem,
        CancellationToken cancellationToken)
    {
        try
        {
            await using (var identificationStream = file.OpenReadStream())
            {
                var imageInfo = await Image.IdentifyAsync(identificationStream, cancellationToken);
                if (imageInfo is null
                    || imageInfo.Width > MaxDimension
                    || imageInfo.Height > MaxDimension
                    || (long)imageInfo.Width * imageInfo.Height > MaxPixelCount)
                {
                    return (null, "Image dimensions are too large.");
                }
            }

            await using var imageStream = file.OpenReadStream();
            using var image = await Image.LoadAsync(imageStream, cancellationToken);
            if (image.Frames.Count != 1)
            {
                return (null, "Animated images are not supported.");
            }

            image.Mutate(context => context.AutoOrient());
            image.Metadata.ExifProfile = null;
            image.Metadata.IptcProfile = null;
            image.Metadata.XmpProfile = null;

            var variants = new List<ProcessedImageVariant>();
            foreach (var width in ProductImageVariants.GetTargetWidths(image.Width))
            {
                using var variant = image.CloneAs<Rgba32>();
                if (variant.Width > width)
                {
                    var height = Math.Max(1, (int)Math.Round(variant.Height * (width / (double)variant.Width)));
                    variant.Mutate(context => context.Resize(width, height));
                }

                await using var output = new MemoryStream();
                await variant.SaveAsWebpAsync(
                    output,
                    new WebpEncoder
                    {
                        FileFormat = WebpFileFormatType.Lossy,
                        Quality = WebpQuality,
                        Method = WebpEncodingMethod.BestQuality,
                        EntropyPasses = 3,
                        SkipMetadata = true
                    },
                    cancellationToken);

                variants.Add(new ProcessedImageVariant(
                    $"{imageStem}-{variant.Width}.webp",
                    output.ToArray()));
            }

            return (variants, null);
        }
        catch (UnknownImageFormatException)
        {
            return (null, "The uploaded file is not a valid supported image.");
        }
        catch (InvalidImageContentException)
        {
            return (null, "The uploaded image is damaged or invalid.");
        }
    }

    private async Task<(string? ImageUrl, IReadOnlyList<string> SavedImageUrls, string? Error)> StoreOptimizedImageAsync(
        IFormFile file,
        string imageStem,
        string storagePrefix,
        CancellationToken cancellationToken)
    {
        var (variants, processingError) = await CreateWebpVariantsAsync(file, imageStem, cancellationToken);
        if (processingError is not null)
        {
            return (null, [], processingError);
        }

        var savedImageUrls = new List<string>();
        try
        {
            foreach (var variant in variants!)
            {
                await using var content = new MemoryStream(variant.Content, writable: false);
                savedImageUrls.Add(await SaveFileAsync(content, variant.FileName, storagePrefix, cancellationToken));
            }
        }
        catch
        {
            await DeleteStoredFilesAsync(savedImageUrls, cancellationToken);
            throw;
        }

        return (savedImageUrls[^1], savedImageUrls, null);
    }

    private async Task<string> SaveFileAsync(
        Stream content,
        string fileName,
        string storagePrefix,
        CancellationToken cancellationToken)
    {
        if (storageOptions.Value.UseS3)
        {
            return await SaveS3FileAsync(content, fileName, storagePrefix, cancellationToken);
        }

        return await SaveLocalFileAsync(content, fileName, storagePrefix, cancellationToken);
    }

    private async Task<string> SaveLocalFileAsync(
        Stream content,
        string fileName,
        string storagePrefix,
        CancellationToken cancellationToken)
    {
        var uploadDirectory = GetUploadDirectory();
        Directory.CreateDirectory(uploadDirectory);

        var filePath = Path.Combine(uploadDirectory, fileName);
        await using var stream = File.Create(filePath);
        await content.CopyToAsync(stream, cancellationToken);

        return BuildImageRoute(BuildObjectKey(storagePrefix, fileName));
    }

    private async Task<string> SaveS3FileAsync(
        Stream content,
        string fileName,
        string storagePrefix,
        CancellationToken cancellationToken)
    {
        var options = storageOptions.Value;
        var objectKey = BuildObjectKey(storagePrefix, fileName);

        using var client = CreateS3Client(options);
        var request = new PutObjectRequest
        {
            BucketName = options.BucketName,
            Key = objectKey,
            InputStream = content,
            ContentType = "image/webp",
            AutoCloseStream = false
        };
        request.Headers.CacheControl = "public, max-age=31536000, immutable";

        await client.PutObjectAsync(request, cancellationToken);

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
        var storedUrls = imageUrls
            .SelectMany(ProductImageVariants.GetStoredVariantUrls)
            .Distinct(StringComparer.OrdinalIgnoreCase);

        foreach (var imageUrl in storedUrls)
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

    private static string BuildObjectKey(string storagePrefix, string fileName)
    {
        var prefix = storagePrefix.Trim('/');
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

    private bool IsAllowedCatalogObjectKey(string objectKey)
    {
        var productPrefix = storageOptions.Value.ProductImagePrefix.Trim('/');
        var sampleBookPrefix = storageOptions.Value.SampleBookImagePrefix.Trim('/');
        return !string.IsNullOrWhiteSpace(objectKey)
            && !objectKey.Contains("..", StringComparison.Ordinal)
            && !objectKey.Contains('\\')
            && !Path.IsPathRooted(objectKey)
            && (objectKey.StartsWith($"{productPrefix}/", StringComparison.Ordinal)
                || objectKey.StartsWith($"{sampleBookPrefix}/", StringComparison.Ordinal));
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

    internal sealed record ProcessedImageVariant(string FileName, byte[] Content);
}

