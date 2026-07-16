using Perdecim.Api.Helpers;

namespace Perdecim.Api.Tests;

public class ProductImageVariantsTests
{
    private const string OptimizedUrl = "/api/product-images/products/42-0123456789abcdef0123456789abcdef-1600.webp";

    [Fact]
    public void GetTargetWidths_DoesNotUpscaleSourceImages()
    {
        Assert.Equal([800, 1200, 1600], ProductImageVariants.GetTargetWidths(1600));
        Assert.Equal([640], ProductImageVariants.GetTargetWidths(640));
        Assert.Equal([800, 1200, 2000], ProductImageVariants.GetTargetWidths(3200));
    }

    [Fact]
    public void GetVariantUrl_ReturnsResponsiveVariantFromOptimizedUrl()
    {
        Assert.Equal(
            "/api/product-images/products/42-0123456789abcdef0123456789abcdef-800.webp",
            ProductImageVariants.GetVariantUrl(OptimizedUrl, ProductImageVariants.SmallWidth));
        Assert.Equal(1600, ProductImageVariants.GetVariantWidth(OptimizedUrl, ProductImageVariants.LargeWidth));
    }

    [Fact]
    public void GetVariantUrl_LeavesLegacyImagesUntouched()
    {
        const string legacyUrl = "/api/product-images/products/42-0123456789abcdef0123456789abcdef.jpg";

        Assert.Equal(legacyUrl, ProductImageVariants.GetVariantUrl(legacyUrl, ProductImageVariants.SmallWidth));
        Assert.Null(ProductImageVariants.GetVariantWidth(legacyUrl, ProductImageVariants.SmallWidth));
        Assert.Equal([legacyUrl], ProductImageVariants.GetStoredVariantUrls(legacyUrl));
    }
}
