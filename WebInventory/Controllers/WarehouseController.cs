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
                m.Quantity,
                Unit = new { m.Unit!.Id, m.Unit.Name, m.Unit.Measurement, m.Unit.Sku }
            })
            .ToList();

        return Ok(result);
    }
}