using AyHali.Api.DTOs.Products;
using AyHali.Api.Helpers;
using AyHali.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AyHali.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController(ProductService productService) : ControllerBase
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

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteProduct(int id, CancellationToken cancellationToken)
    {
        var deleted = await productService.DeleteProductAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
