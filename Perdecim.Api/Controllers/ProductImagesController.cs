using Perdecim.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Perdecim.Api.Controllers;

[ApiController]
[Route("api/product-images")]
public class ProductImagesController(ProductImageService productImageService) : ControllerBase
{
    [HttpGet("{**objectKey}")]
    public async Task<IActionResult> GetImage(string objectKey, CancellationToken cancellationToken)
    {
        var (content, contentType) = await productImageService.GetImageAsync(objectKey, cancellationToken);
        if (content is null)
        {
            return NotFound();
        }

        return File(content, contentType ?? "application/octet-stream");
    }
}
