using Microsoft.AspNetCore.Http;
using Perdecim.Api.Services;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

namespace Perdecim.Api.Tests;

public class ProductImageServiceTests
{
    [Fact]
    public void HasExpectedImageSignature_AcceptsSupportedFormats()
    {
        Assert.True(ProductImageService.HasExpectedImageSignature(
            ".png",
            new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }));
        Assert.True(ProductImageService.HasExpectedImageSignature(
            ".jpg",
            new byte[] { 0xFF, 0xD8, 0xFF }));
        Assert.True(ProductImageService.HasExpectedImageSignature(
            ".webp",
            "RIFF1234WEBP"u8));
    }

    [Fact]
    public void HasExpectedImageSignature_RejectsMismatchedContent()
    {
        Assert.False(ProductImageService.HasExpectedImageSignature(
            ".png",
            "<html>not an image</html>"u8));
        Assert.False(ProductImageService.HasExpectedImageSignature(
            ".jpg",
            new byte[] { 0x89, 0x50, 0x4E, 0x47 }));
    }

    [Fact]
    public async Task CreateWebpVariantsAsync_CreatesResponsiveLossyWebpFiles()
    {
        await using var upload = new MemoryStream();
        using (var source = new Image<Rgba32>(1600, 900, new Rgba32(194, 176, 151)))
        {
            await source.SaveAsPngAsync(upload);
        }

        upload.Position = 0;
        var file = new FormFile(upload, 0, upload.Length, "file", "curtain.png");
        var (variants, error) = await ProductImageService.CreateWebpVariantsAsync(
            file,
            "42-0123456789abcdef0123456789abcdef",
            CancellationToken.None);

        Assert.Null(error);
        Assert.NotNull(variants);
        Assert.Equal(3, variants.Count);
        Assert.Collection(
            variants,
            variant => Assert.EndsWith("-800.webp", variant.FileName),
            variant => Assert.EndsWith("-1200.webp", variant.FileName),
            variant => Assert.EndsWith("-1600.webp", variant.FileName));
        Assert.All(variants, variant => Assert.True(ProductImageService.HasExpectedImageSignature(".webp", variant.Content)));
    }
}
