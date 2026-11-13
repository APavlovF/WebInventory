using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using WebInventory.Data;
using WebInventory.Models;

namespace WebInventory.Controllers;

[ApiController]
[Route("api/materials")]
public class WarehouseController(EfDbContext context) : ControllerBase
{
    [Authorize]
    [HttpPost("fetch")]
    public async Task<IActionResult> GetMaterials()
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        List<UnitStock> materials =
            await context.UnitStocks.Where(s => s.UserId == userId).Include(s => s.Unit).ToListAsync();
        var result = materials
            .Select(m => new
            {
                m.Id,
                m.LowStockAlert,
                m.MaxStockAlert,
                m.Quantity,
                Unit = new { m.Unit!.Id, m.Unit.Name, m.Unit.Measurement, m.Unit.Sku }
            })
            .ToList();

        return Ok(result);
    }

    [Authorize]
    [HttpPost("limit")]
    public async Task<IActionResult> SetMaterialsLimit([FromBody] List<UnitStock> updatedStocks)
    {
        if (updatedStocks == null || updatedStocks.Count == 0)
        {
            return BadRequest("No stock limits provided.");
        }

        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        List<int> stockIds = [.. updatedStocks.Select(s => s.Id)];
        Dictionary<int, UnitStock> dbStocks = await context.UnitStocks
            .Where(s => s.UserId == userId && stockIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id);
        foreach (UnitStock incoming in updatedStocks)
        {
            if (!dbStocks.TryGetValue(incoming.Id, out UnitStock dbStock)) continue;
            dbStock.LowStockAlert = incoming.LowStockAlert;
            dbStock.MaxStockAlert = incoming.MaxStockAlert;
        }

        await context.SaveChangesAsync();

        return Ok();
    }
}