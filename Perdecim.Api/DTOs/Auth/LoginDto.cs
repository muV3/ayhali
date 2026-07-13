using System.ComponentModel.DataAnnotations;

namespace Perdecim.Api.DTOs.Auth;

public class LoginDto
{
    [Required]
    [EmailAddress]
    [MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Password { get; set; } = string.Empty;
}

