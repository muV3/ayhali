namespace AyHali.Api.Options;

public class JwtOptions
{
    public string Issuer { get; set; } = "AyHali.Api";
    public string Audience { get; set; } = "AyHali.Admin";
    public string Secret { get; set; } = string.Empty;
    public int ExpirationMinutes { get; set; } = 120;
}
