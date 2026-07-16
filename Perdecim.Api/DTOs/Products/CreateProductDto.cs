using System.ComponentModel.DataAnnotations;

namespace Perdecim.Api.DTOs.Products;

public class CreateProductDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Code { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Range(1, int.MaxValue)]
    public int CategoryId { get; set; }

    [Range(1, int.MaxValue)]
    public int FabricSampleBookId { get; set; }

    public int? StyleId { get; set; }
    public int? MaterialId { get; set; }

    public bool IsAvailable { get; set; } = true;
    public bool IsFeatured { get; set; }
    public IReadOnlyList<int> ColorIds { get; set; } = [];
    public IReadOnlyList<ProductSizeInputDto> Sizes { get; set; } = [];
}

