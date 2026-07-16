using Perdecim.Api.Helpers;

namespace Perdecim.Api.DTOs.Products;

public class ProductListDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public bool IsAvailable { get; set; }
    public bool IsFeatured { get; set; }
    public string? MainImageUrl { get; set; }
    public string? MainImageSmallUrl => MainImageUrl is null ? null : ProductImageVariants.GetVariantUrl(MainImageUrl, ProductImageVariants.SmallWidth);
    public string? MainImageMediumUrl => MainImageUrl is null ? null : ProductImageVariants.GetVariantUrl(MainImageUrl, ProductImageVariants.MediumWidth);
    public string? MainImageLargeUrl => MainImageUrl is null ? null : ProductImageVariants.GetVariantUrl(MainImageUrl, ProductImageVariants.LargeWidth);
    public int? MainImageSmallWidth => MainImageUrl is null ? null : ProductImageVariants.GetVariantWidth(MainImageUrl, ProductImageVariants.SmallWidth);
    public int? MainImageMediumWidth => MainImageUrl is null ? null : ProductImageVariants.GetVariantWidth(MainImageUrl, ProductImageVariants.MediumWidth);
    public int? MainImageLargeWidth => MainImageUrl is null ? null : ProductImageVariants.GetVariantWidth(MainImageUrl, ProductImageVariants.LargeWidth);
    public string Category { get; set; } = string.Empty;
    public int FabricSampleBookId { get; set; }
    public string FabricSampleBookName { get; set; } = string.Empty;
    public IReadOnlyList<string> Colors { get; set; } = [];
    public IReadOnlyList<string> Sizes { get; set; } = [];
}

