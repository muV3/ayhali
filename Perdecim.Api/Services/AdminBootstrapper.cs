using Perdecim.Api.Data;
using Perdecim.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Perdecim.Api.Services;

public class AdminBootstrapper(
    IServiceProvider serviceProvider,
    IConfiguration configuration,
    ILogger<AdminBootstrapper> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var passwordHashService = scope.ServiceProvider.GetRequiredService<PasswordHashService>();

        if (await dbContext.AdminUsers.AnyAsync(cancellationToken))
        {
            return;
        }

        var email = configuration["Admin:Email"];
        var password = configuration["Admin:Password"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning("No admin user exists and Admin:Email/Admin:Password are not configured.");
            return;
        }

        dbContext.AdminUsers.Add(new AdminUser
        {
            Email = email.Trim().ToLowerInvariant(),
            PasswordHash = passwordHashService.HashPassword(password),
            Role = "Admin",
            CreatedAt = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded initial admin user {Email}.", email);
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}

