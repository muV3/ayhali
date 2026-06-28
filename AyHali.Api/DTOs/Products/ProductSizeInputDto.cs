using System.ComponentModel.DataAnnotations;

namespace AyHali.Api.DTOs.Products;

public class ProductSizeInputDto
{
    [Range(1, int.MaxValue)]
    public int SizeId { get; set; }

    [Range(0, int.MaxValue)]
    public int StockQuantity { get; set; }
}
