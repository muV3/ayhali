using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Perdecim.Api.Entities;
using Perdecim.Api.Options;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Perdecim.Api.Services;

public class JwtTokenService(IOptions<JwtOptions> jwtOptions)
{
    public (string Token, DateTime ExpiresAtUtc) CreateToken(AdminUser adminUser)
    {
        var options = jwtOptions.Value;
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(options.ExpirationMinutes);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, adminUser.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new Claim(JwtRegisteredClaimNames.Iat, EpochTime.GetIntDate(DateTime.UtcNow).ToString(), ClaimValueTypes.Integer64),
            new Claim(JwtRegisteredClaimNames.Email, adminUser.Email),
            new Claim(ClaimTypes.Email, adminUser.Email),
            new Claim(ClaimTypes.Role, adminUser.Role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: options.Issuer,
            audience: options.Audience,
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAtUtc);
    }
}

