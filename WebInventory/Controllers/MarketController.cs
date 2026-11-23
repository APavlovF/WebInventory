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
        if (materials == null || materials.Count == 0)
        {
            return BadRequest("No materials provided.");
        }

        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        Dictionary<string, UnitStock> dbMaterials = (await context.UnitStocks
                .Where(u => u.UserId == userId)
                .Include(u => u.Unit)
                .ToListAsync())
            .ToDictionary(k => k.Unit.GetUniqueKey(), StringComparer.OrdinalIgnoreCase);
        Dictionary<string, Unit> dbUnits =
            (await context.Units.ToListAsync()).ToDictionary(u => u.GetUniqueKey(), StringComparer.OrdinalIgnoreCase);
        foreach (UnitStock material in materials)
        {
            string unitName = material.Unit.GetUniqueKey();
            if (dbMaterials.TryGetValue(unitName, out UnitStock existingStock))
            {
                if (existingStock.IsDeleted)
                {
                    // Restore soft-deleted stock with fresh values
                    existingStock.IsDeleted = false;
                    existingStock.Quantity = material.Quantity;
                    existingStock.Price = material.Price;
                    existingStock.LowStockAlert = material.LowStockAlert;
                    existingStock.MaxStockAlert = material.MaxStockAlert;
                }
                else
                {
                    decimal totalQty = existingStock.Quantity + material.Quantity;
                    if (existingStock.Price != material.Price && totalQty > 0)
                    {
                        existingStock.Price =
                            (existingStock.Price * existingStock.Quantity + material.Price * material.Quantity) /
                            totalQty;
                    }

                    existingStock.Quantity = totalQty;
                }
            }
            else
            {
                if (dbUnits.TryGetValue(unitName, out Unit existingUnit))
                {
                    material.Unit = existingUnit;
                }
                else
                {
                    material.Unit.TrimKeyProperties();
                    dbUnits[unitName] = material.Unit;
                }

                material.UserId = userId;
                material.IsDeleted = false;
                context.UnitStocks.Add(material);
                dbMaterials[unitName] = material;
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
        Dictionary<string, ProductStock> stock =
            (await context.ProductStocks.Where(p => p.Product.UserId == userId).Include(p => p.Product).ToListAsync())
            .ToDictionary(k => k.Product.GetUniqueKey());
        foreach (ProductStock product in products)
        {
            if (stock.TryGetValue(product.Product.GetUniqueKey(), out ProductStock s))
            {
                s.Quantity -= product.Quantity;
            }
        }

        await context.SaveChangesAsync();

        return Ok();
    }
}