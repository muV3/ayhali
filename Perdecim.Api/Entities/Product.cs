namespace Perdecim.Api.Entities;

public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int CategoryId { get; set; }
    public int? StyleId { get; set; }
    public int? MaterialId { get; set; }
    public bool IsAvailable { get; set; } = true;
    public bool IsFeatured { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Category? Category { get; set; }
    public Style? Style { get; set; }
    public Material? Material { get; set; }
    public ICollection<ProductImage> Images { get; set; } = [];
    public ICollection<ProductSize> ProductSizes { get; set; } = [];
    public ICollection<ProductColor> ProductColors { get; set; } = [];
}

