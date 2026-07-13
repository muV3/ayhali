using Perdecim.Api.DTOs.Products;
using Perdecim.Api.Helpers;
using Perdecim.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Perdecim.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController(
    ProductService productService,
    ProductImageService productImageService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetProducts(
        [FromQuery] ProductQueryParams queryParams,
        CancellationToken cancellationToken)
    {
        var products = await productService.GetProductsAsync(queryParams, cancellationToken);
        return Ok(products);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetProduct(int id, CancellationToken cancellationToken)
    {
        var product = await productService.GetProductByIdAsync(id, cancellationToken);
        return product is null ? NotFound() : Ok(product);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> CreateProduct(
        CreateProductDto dto,
        CancellationToken cancellationToken)
    {
        var (product, error) = await productService.CreateProductAsync(dto, cancellationToken);
        if (error is not null)
        {
            return BadRequest(new { message = error });
        }

        return CreatedAtAction(nameof(GetProduct), new { id = product!.Id }, product);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateProduct(
        int id,
        UpdateProductDto dto,
        CancellationToken cancellationToken)
    {
        var (product, error) = await productService.UpdateProductAsync(id, dto, cancellationToken);
        if (error is not null)
        {
            return BadRequest(new { message = error });
        }

        return product is null ? NotFound() : Ok(product);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteProduct(int id, CancellationToken cancellationToken)
    {
        var (deleted, imageUrls) = await productService.DeleteProductAsync(id, cancellationToken);
        if (!deleted)
        {
            return NotFound();
        }

        await productImageService.DeleteStoredFilesAsync(imageUrls, cancellationToken);
        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [RequestSizeLimit(11 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 11 * 1024 * 1024)]
    [HttpPost("{id:int}/images")]
    public async Task<IActionResult> UploadProductImage(
        int id,
        IFormFile file,
        [FromForm] bool isMainImage,
        [FromForm] int? displayOrder,
        CancellationToken cancellationToken)
    {
        var (image, error, notFound) = await productImageService.UploadImageAsync(
            id,
            file,
            isMainImage,
            displayOrder,
            cancellationToken);

        if (notFound)
        {
            return NotFound();
        }

        return error is not null ? BadRequest(new { message = error }) : Ok(image);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{productId:int}/images/{imageId:int}")]
    public async Task<IActionResult> DeleteProductImage(
        int productId,
        int imageId,
        CancellationToken cancellationToken)
    {
        var (deleted, productNotFound) = await productImageService.DeleteImageAsync(
            productId,
            imageId,
            cancellationToken);

        return productNotFound || !deleted ? NotFound() : NoContent();
    }
}

