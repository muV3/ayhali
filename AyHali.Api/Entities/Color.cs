namespace AyHali.Api.Entities;

public class Color
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public ICollection<ProductColor> ProductColors { get; set; } = [];
}
