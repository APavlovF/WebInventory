using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using WebInventory.Data;
using WebInventory.Models;

namespace WebInventory.Controllers;

[ApiController]
[Route("api/product")]
public class ProductController(EfDbContext context) : ControllerBase
{

    [Authorize]
    [HttpPost("batch")]
    public async Task<IActionResult> AddBatch([FromBody] List<ProductStock> products)
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        Dictionary<string, ProductStock> dbProducts = await context.ProductStocks.Where(p => p.Product.UserId == userId)
            .Include(p => p.Product).ToDictionaryAsync(k => k.Product.Name);
        Dictionary<string, UnitStock> dbMaterials = await context.UnitStocks.Where(u => u.UserId == userId)
            .Include(u => u.Unit).ToDictionaryAsync(k => k.Unit.Name);
        foreach (ProductStock productStock in products)
        {
            if (dbProducts.TryGetValue(productStock.Product.Name, out ProductStock p))
            {
                p.Quantity += productStock.Quantity;
            }
            else
            {
                Product dbProduct = await context.Products.Include(s => s.Items).ThenInclude(item => item.Unit)
                    .SingleOrDefaultAsync(s => s.Id == productStock.Product.Id && s.UserId == userId);
                if (dbProduct == null)
                {
                    return BadRequest($"Product {productStock.Product.Id} does not exist.");
                }

                productStock.Product = dbProduct;
                context.ProductStocks.Add(productStock);
            }

            foreach (Item item in productStock.Product.Items)
            {
                if (dbMaterials.TryGetValue(item.Unit.Name, out UnitStock u))
                {
                    u.Quantity -= item.Quantity * productStock.Quantity;
                }
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
        foreach (Item item in product.Items)
        {
            Unit existingUnit = await context.Units.SingleOrDefaultAsync(u => u.Id == item.Unit.Id);
            if (existingUnit == null)
            {
                return BadRequest($"Unit {item.Unit.Id} does not exist.");
            }

            item.Unit = existingUnit;
        }

        product.Commissions = await ResolveCommissions(product.Commissions, userId);
        context.Products.Add(product);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(CreateProduct), new { id = product.Id }, product);
    }

    [Authorize]
    [HttpPost("delete")]
    public async Task<IActionResult> DeleteProducts()
    {
        return Ok();
    }

    [Authorize]
    [HttpPost("fetch")]
    public async Task<IActionResult> GetProducts()
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        List<Product> products = await context.Products.Where(p => p.UserId == userId).Include(p => p.Items)
            .ThenInclude(i => i.Unit).ToListAsync();

        return Ok(products);
    }

    [Authorize]
    [HttpPost("stock")]
    public async Task<IActionResult> GetProductStock()
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        List<ProductStock> products = await context.ProductStocks.Where(p => p.Product.UserId == userId)
            .Include(s => s.Product).ThenInclude(p => p.Items).ThenInclude(i => i.Unit).ToListAsync();
        var result = products
            .Select(p => new
            {
                p.Id,
                p.LowStockAlert,
                p.MaxStockAlert,
                p.Quantity,
                Product = new
                {
                    p.Product!.Id,
                    p.Product.IsDeleted,
                    p.Product.Name,
                    p.Product.Price,
                    p.Product.RetailRate,
                    p.Product.Sku
                }
            })
            .ToList();

        return Ok(result);
    }

    async Task<List<Commission>> ResolveCommissions(List<Commission> incoming, int userId)
    {
        Dictionary<int, Commission> existingCommissions =
            await context.Commissions.Where(c => c.UserId == userId).ToDictionaryAsync(c => c.Id);
        Dictionary<(string Name, decimal Rate), Commission> newlyCreatedByKey = new();
        List<Commission> resolved = [];
        if (incoming == null) return resolved;
        foreach (Commission c in incoming)
        {
            if (c.Id > 0 && existingCommissions.TryGetValue(c.Id, out Commission tracked))
            {
                // Reuse tracked entity from DB
                resolved.Add(tracked);
            }
            else
            {
                (string, decimal Rate) key = (c.Name.Trim(), c.Rate);
                if (!newlyCreatedByKey.TryGetValue(key, out var newComm))
                {
                    newComm = new()
                    {
                        Name = key.Item1,
                        Rate = key.Rate,
                        UserId = userId
                    };
                    newlyCreatedByKey[key] = newComm;
                }

                resolved.Add(newComm);
            }
        }

        return resolved;
    }
}