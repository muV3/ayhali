namespace AyHali.Api.Entities;

public class Size
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public ICollection<ProductSize> ProductSizes { get; set; } = [];
}
