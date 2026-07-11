using Perdecim.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Perdecim.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            status = "Healthy",
            service = "Perdecim.Api",
            timestamp = DateTimeOffset.UtcNow
        });
    }

    [HttpGet("ready")]
    public async Task<IActionResult> GetReady(CancellationToken cancellationToken)
    {
        var databaseIsHealthy = await dbContext.Database.CanConnectAsync(cancellationToken);
        var status = databaseIsHealthy ? "Healthy" : "Degraded";

        var response = new
        {
            status,
            service = "Perdecim.Api",
            database = databaseIsHealthy ? "Connected" : "Unavailable",
            timestamp = DateTimeOffset.UtcNow
        };

        return databaseIsHealthy ? Ok(response) : StatusCode(StatusCodes.Status503ServiceUnavailable, response);
    }
}

