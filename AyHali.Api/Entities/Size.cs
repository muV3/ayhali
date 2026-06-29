namespace AyHali.Api.Entities;

public class Size : ILookupEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public ICollection<ProductSize> ProductSizes { get; set; } = [];
}
