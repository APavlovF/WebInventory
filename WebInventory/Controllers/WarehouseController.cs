using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebInventory.Data;
using WebInventory.Models;
using WebInventory.Services;

namespace WebInventory.Controllers;

[ApiController]
[Route("api/materials")]
public class WarehouseController(IDatabaseReader databaseReader) : ControllerBase
{
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
                m.Quantity,
                Unit = new { m.Unit!.Id, m.Unit.Name, m.Unit.Measurement, m.Unit.Sku }
            })
            .ToList();

        return Ok(result);
    }
}