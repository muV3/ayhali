namespace AyHali.Api.DTOs.Products;

public class ProductDetailDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public decimal? DiscountPrice { get; set; }
    public bool IsDiscounted { get; set; }
    public bool IsAvailable { get; set; }
    public bool IsFeatured { get; set; }
    public string Category { get; set; } = string.Empty;
    public string? Style { get; set; }
    public string? Material { get; set; }
    public IReadOnlyList<string> Colors { get; set; } = [];
    public IReadOnlyList<ProductSizeDto> Sizes { get; set; } = [];
    public IReadOnlyList<ProductImageDto> Images { get; set; } = [];
}
