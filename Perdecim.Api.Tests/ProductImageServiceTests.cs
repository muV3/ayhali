using Perdecim.Api.Services;

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
}
