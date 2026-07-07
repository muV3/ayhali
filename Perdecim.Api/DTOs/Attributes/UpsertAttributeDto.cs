using System.ComponentModel.DataAnnotations;

namespace Perdecim.Api.DTOs.Attributes;

public class UpsertAttributeDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
}

