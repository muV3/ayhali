using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perdecim.Api.DTOs.CustomerHomeImages;
using Perdecim.Api.Services;

namespace Perdecim.Api.Controllers;

[ApiController]
[Route("api/customer-home-images")]
public class CustomerHomeImagesController(CustomerHomeImageService customerHomeImageService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] bool favoritesOnly,
        CancellationToken cancellationToken)
    {
        return Ok(await customerHomeImageService.GetAllAsync(favoritesOnly, cancellationToken));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}/favorite")]
    public async Task<IActionResult> SetFavorite(
        int id,
        UpdateCustomerHomeImageFavoriteDto dto,
        CancellationToken cancellationToken)
    {
        var (image, error, notFound) = await customerHomeImageService.SetFavoriteAsync(
            id,
            dto.IsFavorite,
            cancellationToken);
        if (notFound) return NotFound();
        return error is not null ? BadRequest(new { message = error }) : Ok(image);
    }

    [Authorize(Roles = "Admin")]
    [RequestSizeLimit(11 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 11 * 1024 * 1024)]
    [HttpPost]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken cancellationToken)
    {
        var (image, error) = await customerHomeImageService.UploadAsync(file, cancellationToken);
        return error is not null ? BadRequest(new { message = error }) : Ok(image);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("order")]
    public async Task<IActionResult> Reorder(
        ReorderCustomerHomeImagesDto dto,
        CancellationToken cancellationToken)
    {
        var (images, error) = await customerHomeImageService.ReorderAsync(dto.ImageIds, cancellationToken);
        return error is not null ? BadRequest(new { message = error }) : Ok(images);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        return await customerHomeImageService.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
    }
}
