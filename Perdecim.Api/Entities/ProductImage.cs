namespace Perdecim.Api.Entities;

public class ProductImage
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsMainImage { get; set; }
    public int DisplayOrder { get; set; }

    public Product? Product { get; set; }
}

