using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using WebInventory.Data;
using WebInventory.Models;
using WebInventory.Services;

namespace WebInventory.Controllers;

[ApiController]
[Route("api/product")]
public class ProductController(EfDbContext context, IDatabaseReader databaseReader) : ControllerBase
{

    [Authorize]
    [HttpPost("batch")]
    public async Task<IActionResult> AddBatch([FromBody] List<ProductStock> products)
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        Dictionary<string, ProductStock> dbProducts = await context.ProductStocks.Where(p => p.Product.UserId == userId)
            .ToDictionaryAsync(k => k.Product.Name);
        foreach (ProductStock product in products)
        {
            if (dbProducts.TryGetValue(product.Product.Name, out ProductStock p))
            {
                product.Quantity += p.Quantity;
            }
            else
            {
                product.Product.UserId = userId;
                context.ProductStocks.Add(product);
            }
        }

        await context.SaveChangesAsync();

        return Ok();
    }

    [Authorize]
    [HttpPost("add")]
    public async Task<IActionResult> CreateProduct([FromBody] Product product)
    {
        if (product == null)
        {
            return BadRequest("Product data is required.");
        }

        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        product.UserId = userId;
        context.Products.Add(product);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(CreateProduct), new { id = product.Id }, product);
    }

    [Authorize]
    [HttpPost("fetch")]
    public async Task<IActionResult> GetProducts()
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        IEnumerable<Product> products = await databaseReader.Read<Product>();
        var result = products.Where(p => p.UserId == userId).ToList();

        return Ok(result);
    }

    [Authorize]
    [HttpPost("stock")]
    public async Task<IActionResult> GetProductStock()
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        IEnumerable<ProductStock> products = await databaseReader.Read<ProductStock>();

        var result = products
            .Where(p => p.Product.UserId == userId)
            .Select(p => new
            {
                p.Id,
                p.Quantity,
                Product = new { p.Product!.Id, p.Product.Name, p.Product.Sku }
            })
            .ToList();

        return Ok(result);
    }
}