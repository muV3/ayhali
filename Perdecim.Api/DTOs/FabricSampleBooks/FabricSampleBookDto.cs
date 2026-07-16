using Perdecim.Api.Helpers;

namespace Perdecim.Api.DTOs.FabricSampleBooks;

public class FabricSampleBookDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? ImageSmallUrl => ImageUrl is null ? null : ProductImageVariants.GetVariantUrl(ImageUrl, ProductImageVariants.SmallWidth);
    public string? ImageMediumUrl => ImageUrl is null ? null : ProductImageVariants.GetVariantUrl(ImageUrl, ProductImageVariants.MediumWidth);
    public string? ImageLargeUrl => ImageUrl is null ? null : ProductImageVariants.GetVariantUrl(ImageUrl, ProductImageVariants.LargeWidth);
    public int? ImageSmallWidth => ImageUrl is null ? null : ProductImageVariants.GetVariantWidth(ImageUrl, ProductImageVariants.SmallWidth);
    public int? ImageMediumWidth => ImageUrl is null ? null : ProductImageVariants.GetVariantWidth(ImageUrl, ProductImageVariants.MediumWidth);
    public int? ImageLargeWidth => ImageUrl is null ? null : ProductImageVariants.GetVariantWidth(ImageUrl, ProductImageVariants.LargeWidth);
    public int ProductCount { get; set; }
}
