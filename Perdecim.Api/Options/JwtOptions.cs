namespace Perdecim.Api.Options;

public class JwtOptions
{
    public string Issuer { get; set; } = "Perdecim.Api";
    public string Audience { get; set; } = "Perdecim.Admin";
    public string Secret { get; set; } = string.Empty;
    public int ExpirationMinutes { get; set; } = 60;
}

