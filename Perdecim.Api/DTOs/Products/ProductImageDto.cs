using Perdecim.Api.Helpers;

namespace Perdecim.Api.DTOs.Products;

public class ProductImageDto
{
    public int Id { get; set; }
    public string Url { get; set; } = string.Empty;
    public string SmallUrl => ProductImageVariants.GetVariantUrl(Url, ProductImageVariants.SmallWidth);
    public string MediumUrl => ProductImageVariants.GetVariantUrl(Url, ProductImageVariants.MediumWidth);
    public string LargeUrl => ProductImageVariants.GetVariantUrl(Url, ProductImageVariants.LargeWidth);
    public int? SmallWidth => ProductImageVariants.GetVariantWidth(Url, ProductImageVariants.SmallWidth);
    public int? MediumWidth => ProductImageVariants.GetVariantWidth(Url, ProductImageVariants.MediumWidth);
    public int? LargeWidth => ProductImageVariants.GetVariantWidth(Url, ProductImageVariants.LargeWidth);
    public bool IsMainImage { get; set; }
    public int DisplayOrder { get; set; }
}

