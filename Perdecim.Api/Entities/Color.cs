namespace Perdecim.Api.Entities;

public class Color : ILookupEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public ICollection<ProductColor> ProductColors { get; set; } = [];
}

