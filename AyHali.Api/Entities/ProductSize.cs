namespace AyHali.Api.Entities;

public class ProductSize
{
    public int ProductId { get; set; }
    public int SizeId { get; set; }
    public int StockQuantity { get; set; }

    public Product? Product { get; set; }
    public Size? Size { get; set; }
}
