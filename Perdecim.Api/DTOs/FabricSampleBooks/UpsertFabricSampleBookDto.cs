using System.ComponentModel.DataAnnotations;

namespace Perdecim.Api.DTOs.FabricSampleBooks;

public class UpsertFabricSampleBookDto
{
    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;
}
