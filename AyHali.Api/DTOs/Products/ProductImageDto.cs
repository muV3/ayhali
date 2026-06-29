namespace AyHali.Api.DTOs.Products;

public class ProductImageDto
{
    public int Id { get; set; }
    public string Url { get; set; } = string.Empty;
    public bool IsMainImage { get; set; }
    public int DisplayOrder { get; set; }
}
