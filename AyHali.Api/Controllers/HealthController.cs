using AyHali.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AyHali.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var databaseIsHealthy = await dbContext.Database.CanConnectAsync(cancellationToken);
        var status = databaseIsHealthy ? "Healthy" : "Degraded";

        var response = new
        {
            status,
            service = "AyHali.Api",
            database = databaseIsHealthy ? "Connected" : "Unavailable",
            timestamp = DateTimeOffset.UtcNow
        };

        return databaseIsHealthy ? Ok(response) : StatusCode(StatusCodes.Status503ServiceUnavailable, response);
    }
}
