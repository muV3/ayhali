namespace AyHali.Api.Entities;

public class Category : ILookupEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public ICollection<Product> Products { get; set; } = [];
}
