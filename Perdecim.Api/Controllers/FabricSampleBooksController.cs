using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perdecim.Api.DTOs.FabricSampleBooks;
using Perdecim.Api.Services;

namespace Perdecim.Api.Controllers;

[ApiController]
[Route("api/fabric-sample-books")]
public class FabricSampleBooksController(FabricSampleBookService sampleBookService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await sampleBookService.GetAllAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var sampleBook = await sampleBookService.GetByIdAsync(id, cancellationToken);
        return sampleBook is null ? NotFound() : Ok(sampleBook);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(UpsertFabricSampleBookDto dto, CancellationToken cancellationToken)
    {
        var (sampleBook, error) = await sampleBookService.CreateAsync(dto.Name, cancellationToken);
        return error is not null
            ? BadRequest(new { message = error })
            : CreatedAtAction(nameof(GetById), new { id = sampleBook!.Id }, sampleBook);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpsertFabricSampleBookDto dto, CancellationToken cancellationToken)
    {
        var (sampleBook, error, notFound) = await sampleBookService.UpdateAsync(id, dto.Name, cancellationToken);
        if (notFound) return NotFound();
        return error is not null ? BadRequest(new { message = error }) : Ok(sampleBook);
    }

    [Authorize(Roles = "Admin")]
    [RequestSizeLimit(11 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 11 * 1024 * 1024)]
    [HttpPost("{id:int}/image")]
    public async Task<IActionResult> UploadImage(int id, IFormFile file, CancellationToken cancellationToken)
    {
        var (sampleBook, error, notFound) = await sampleBookService.UploadImageAsync(id, file, cancellationToken);
        if (notFound) return NotFound();
        return error is not null ? BadRequest(new { message = error }) : Ok(sampleBook);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}/image")]
    public async Task<IActionResult> DeleteImage(int id, CancellationToken cancellationToken)
    {
        var (deleted, notFound) = await sampleBookService.DeleteImageAsync(id, cancellationToken);
        return notFound ? NotFound() : deleted ? NoContent() : NotFound();
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var (deleted, inUse, notFound) = await sampleBookService.DeleteAsync(id, cancellationToken);
        if (notFound) return NotFound();
        if (inUse) return Conflict(new { message = "Silmeden önce bağlı ürünleri başka bir kartelaya taşıyın." });
        return deleted ? NoContent() : NotFound();
    }
}
