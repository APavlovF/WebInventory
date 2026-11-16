using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using WebInventory.Data;
using WebInventory.Models;

namespace WebInventory.Controllers;

[ApiController]
[Route("api/market")]
public class MarketController(EfDbContext context) : ControllerBase
{
    [Authorize]
    [HttpPost("materials")]
    public async Task<IActionResult> AddMaterials([FromBody] List<UnitStock> materials)
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        Dictionary<string, UnitStock> dbMaterials = await context.UnitStocks.Where(u => u.UserId == userId)
            .Include(u => u.Unit).ToDictionaryAsync(k => k.Unit.Name);
        foreach (UnitStock material in materials)
        {
            if (dbMaterials.TryGetValue(material.Unit.Name, out UnitStock u))
            {
                decimal totalQty = u.Quantity + material.Quantity;
                if (u.Price != material.Price && totalQty > 0)
                {
                    u.Price = (u.Price * u.Quantity + material.Price * material.Quantity) / totalQty;
                }

                u.Quantity = totalQty;
            }
            else
            {
                material.UserId = userId;
                context.UnitStocks.Add(material);
            }
        }

        await context.SaveChangesAsync();

        return Ok();
    }

    [Authorize]
    [HttpPost("sell")]
    public async Task<IActionResult> SellProducts([FromBody] List<ProductStock> products)
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        Dictionary<string, ProductStock> stock = await context.ProductStocks.Where(p => p.Product.UserId == userId)
            .Include(p => p.Product).ToDictionaryAsync(k => k.Product.Name);
        foreach (ProductStock product in products)
        {
            if (stock.TryGetValue(product.Product.Name, out ProductStock s))
            {
                s.Quantity -= product.Quantity;
            }
        }

        await context.SaveChangesAsync();

        return Ok();
    }
}