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
    ProductsParser productsParser) : InteractiveController
{
    [HttpPost("materials")]
    public async Task ImportMaterials(IFormFile file, CancellationToken cancellationToken)
    {
        SetHeaders();
        if (file == null || file.Length == 0)
        {
            await SendEventAsync("error", new { message = "No file uploaded." }, cancellationToken);

            return;
        }

        using StreamReader reader = new StreamReader(file.OpenReadStream());
        string content = await reader.ReadToEndAsync(cancellationToken);
        await SendEventAsync("status", new { message = "Parsing materials..." }, cancellationToken);
        List<UnitStock> parsed = await materialsParser.ParseMaterialsAsync(content, file.FileName);

        await SendEventAsync("result", parsed, cancellationToken);
    }

    [HttpPost("products")]
    public async Task ImportProducts(IFormFile file, CancellationToken cancellationToken)
    {
        SetHeaders();
        if (file == null || file.Length == 0)
        {
            await SendEventAsync("error", new { message = "No file uploaded." }, cancellationToken);
            return;
        }

        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        List<Unit> userUnits = await context.UnitStocks.Where(u => u.UserId == userId && !u.IsDeleted)
            .Select(u => u.Unit).ToListAsync(cancellationToken: cancellationToken);

        using StreamReader reader = new StreamReader(file.OpenReadStream());
        string content = await reader.ReadToEndAsync(cancellationToken);

        await SendEventAsync("status", new { message = "Parsing products..." }, cancellationToken);
        List<Product> parsed = await productsParser.ParseProductsAsync(content, file.FileName, userUnits);

        await SendEventAsync("result", parsed, cancellationToken);
    }
}