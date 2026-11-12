using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebInventory.Data;
using WebInventory.Models;
using WebInventory.Services;

namespace WebInventory.Controllers;

[ApiController]
[Route("api/product")]
public class ProductController(EfDbContext context, IDatabaseReader databaseReader) : ControllerBase
{
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateProduct([FromBody] Product product)
    {
        if (product == null)
        {
            return BadRequest("Product data is required.");
        }

        context.Products.Add(product);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(CreateProduct), new { id = product.Id }, product);
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> GetProducts()
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        IEnumerable<ProductStock> products = await databaseReader.Read<ProductStock>();

        var result = products
            .Where(p => p.UserId == userId)
            .Select(p => new
            {
                p.Id,
                p.Product?.Name,
                p.Product?.Sku,
                p.Quantity
            })
            .ToList();

        return Ok(result);
    }
}