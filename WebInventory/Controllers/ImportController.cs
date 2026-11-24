using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using WebInventory.Data;
using WebInventory.DataAi;
using WebInventory.Models;

namespace WebInventory.Controllers;

[ApiController]
[Route("api/import")]
public class ImportController(EfDbContext context,
    MaterialsParser materialsParser,
    ProductsParser productsParser) : ControllerBase
{
    [HttpPost("materials")]
    public async Task<IActionResult> ImportMaterials(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("File is required.");

        using StreamReader reader = new StreamReader(file.OpenReadStream());
        string content = await reader.ReadToEndAsync();
        List<UnitStock> parsed = await materialsParser.ParseMaterialsAsync(content, file.FileName);

        return Ok(parsed);
    }

    [HttpPost("products")]
    public async Task<IActionResult> ImportProducts(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("File is required.");

        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        List<Unit> userUnits = await context.UnitStocks.Where(u => u.UserId == userId && !u.IsDeleted)
            .Select(u => u.Unit).ToListAsync();

        using StreamReader reader = new StreamReader(file.OpenReadStream());
        string content = await reader.ReadToEndAsync();

        List<Product> parsed = await productsParser.ParseProductsAsync(content, file.FileName, userUnits);

        return Ok(parsed);
    }
}