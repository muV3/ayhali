namespace AyHali.Api.DTOs.Products;

public class ProductListDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal? DiscountPrice { get; set; }
    public bool IsDiscounted { get; set; }
    public bool IsAvailable { get; set; }
    public bool IsFeatured { get; set; }
    public string? MainImageUrl { get; set; }
    public string Category { get; set; } = string.Empty;
    public IReadOnlyList<string> Colors { get; set; } = [];
    public IReadOnlyList<string> Sizes { get; set; } = [];
}
