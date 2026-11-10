using Microsoft.AspNetCore.Mvc;
using WebInventory.Data;
using WebInventory.Models;

namespace WebInventory.Controllers;

[ApiController]
[Route("api/product")]
public class ProductController(EfDbContext context) : ControllerBase
{
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
}