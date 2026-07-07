namespace Perdecim.Api.Entities;

public class Style : ILookupEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public ICollection<Product> Products { get; set; } = [];
}

