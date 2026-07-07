using System.ComponentModel.DataAnnotations;

namespace Perdecim.Api.DTOs.Products;

public class ProductSizeInputDto
{
    [Range(1, int.MaxValue)]
    public int SizeId { get; set; }

    [Range(0, int.MaxValue)]
    public int StockQuantity { get; set; }
}

