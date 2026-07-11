using Perdecim.Api.DTOs.Attributes;
using Perdecim.Api.Entities;
using Perdecim.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Perdecim.Api.Controllers;

public abstract class LookupController<TEntity>(LookupService lookupService) : ControllerBase
    where TEntity : class, ILookupEntity, new()
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var attributes = await lookupService.GetAllAsync<TEntity>(cancellationToken);
        return Ok(attributes);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(
        UpsertAttributeDto dto,
        CancellationToken cancellationToken)
    {
        var (attribute, error) = await lookupService.CreateAsync<TEntity>(dto, cancellationToken);
        return error is not null
            ? BadRequest(new { message = error })
            : Created(string.Empty, attribute);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        UpsertAttributeDto dto,
        CancellationToken cancellationToken)
    {
        var (attribute, error) = await lookupService.UpdateAsync<TEntity>(id, dto, cancellationToken);
        if (error is not null)
        {
            return BadRequest(new { message = error });
        }

        return attribute is null ? NotFound() : Ok(attribute);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var (deleted, conflict) = await lookupService.DeleteAsync<TEntity>(id, cancellationToken);
        if (conflict)
        {
            return Conflict(new { message = "This attribute is currently used by one or more products." });
        }

        return deleted ? NoContent() : NotFound();
    }
}

