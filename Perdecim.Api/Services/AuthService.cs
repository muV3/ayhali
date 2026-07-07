using Perdecim.Api.Data;
using Perdecim.Api.DTOs.Auth;
using Microsoft.EntityFrameworkCore;

namespace Perdecim.Api.Services;

public class AuthService(
    AppDbContext dbContext,
    PasswordHashService passwordHashService,
    JwtTokenService jwtTokenService)
{
    public async Task<AuthResponseDto?> LoginAsync(LoginDto dto, CancellationToken cancellationToken)
    {
        var email = dto.Email.Trim().ToLowerInvariant();
        var adminUser = await dbContext.AdminUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(user => user.Email == email, cancellationToken);

        if (adminUser is null || !passwordHashService.VerifyPassword(dto.Password, adminUser.PasswordHash))
        {
            return null;
        }

        var (token, expiresAtUtc) = jwtTokenService.CreateToken(adminUser);
        return new AuthResponseDto
        {
            Token = token,
            Email = adminUser.Email,
            Role = adminUser.Role,
            ExpiresAtUtc = expiresAtUtc
        };
    }
}

