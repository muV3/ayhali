namespace AyHali.Api.Entities;

public class Inquiry
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? Message { get; set; }
    public string? Source { get; set; }
    public DateTime CreatedAt { get; set; }

    public Product? Product { get; set; }
}
