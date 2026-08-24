using Perdecim.Api.Helpers;

namespace Perdecim.Api.DTOs.CustomerHomeImages;

public class CustomerHomeImageDto
{
    public int Id { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string ImageSmallUrl => ProductImageVariants.GetVariantUrl(ImageUrl, ProductImageVariants.SmallWidth);
    public string ImageMediumUrl => ProductImageVariants.GetVariantUrl(ImageUrl, ProductImageVariants.MediumWidth);
    public string ImageLargeUrl => ProductImageVariants.GetVariantUrl(ImageUrl, ProductImageVariants.LargeWidth);
    public int? ImageSmallWidth => ProductImageVariants.GetVariantWidth(ImageUrl, ProductImageVariants.SmallWidth);
    public int? ImageMediumWidth => ProductImageVariants.GetVariantWidth(ImageUrl, ProductImageVariants.MediumWidth);
    public int? ImageLargeWidth => ProductImageVariants.GetVariantWidth(ImageUrl, ProductImageVariants.LargeWidth);
    public int DisplayOrder { get; set; }
    public bool IsFavorite { get; set; }
}
