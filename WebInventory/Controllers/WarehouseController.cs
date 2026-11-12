using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebInventory.Data;
using WebInventory.Models;
using WebInventory.Services;

namespace WebInventory.Controllers;

[ApiController]
[Route("api/materials")]
public class WarehouseController(EfDbContext context, IDatabaseReader databaseReader) : ControllerBase
{
    [Authorize]
    [HttpPost("batch")]
    public async Task<IActionResult> AddBatch([FromBody] List<UnitStock> materials)
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        materials.ForEach(p => p.UserId = userId);
        context.UnitStocks.AddRange(materials);
        await context.SaveChangesAsync();

        return Ok();
    }

    [Authorize]
    [HttpPost("fetch")]
    public async Task<IActionResult> GetMaterials()
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        IEnumerable<UnitStock> materials = await databaseReader.Read<UnitStock>();

        var result = materials
            .Where(m => m.UserId == userId)
            .Select(m => new
            {
                m.Id,
                m.Unit?.Name,
                m.Unit?.Sku,
                m.Quantity
            })
            .ToList();

        return Ok(result);
    }
}