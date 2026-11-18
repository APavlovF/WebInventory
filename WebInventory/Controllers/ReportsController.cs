using Microsoft.AspNetCore.Mvc;
using WebInventory.Map;
using WebInventory.Models;
using WebInventory.Services;

namespace WebInventory.Controllers;

[ApiController]
[Route("api/reports")]
public class ReportsController(IFileWriterFactory fileWriterFactory) : ControllerBase
{
    [HttpPost("inventory")]
    public async Task<IActionResult> ExportMaterials([FromBody] ExportRequest<UnitStock> request)
    {
        if (request.Items == null || request.Items.Count == 0)
            return BadRequest("No items provided for export.");

        IFileWriter writer = fileWriterFactory.GetWriter(request.Format);
        List<ColumnDefinition<UnitStock>> columns = UnitMap.Columns;

        byte[] fileBytes = await writer.Write(request.Items, columns);
        string fileName = $"materials-{DateTime.UtcNow:yyyyMMdd}.{writer.Format}";

        return File(fileBytes, writer.ContentType, fileName);
    }

    [HttpPost("products")]
    public async Task<IActionResult> ExportProducts([FromBody] ExportRequest<ProductStock> request)
    {
        if (request.Items == null || request.Items.Count == 0)
            return BadRequest("No items provided for export.");

        IFileWriter writer = fileWriterFactory.GetWriter(request.Format);
        List<ColumnDefinition<ProductStock>> columns = ProductMap.Columns;

        byte[] fileBytes = await writer.Write(request.Items, columns);
        string fileName = $"products-{DateTime.UtcNow:yyyyMMdd}{writer.Format}";

        return File(fileBytes, writer.ContentType, fileName);
    }
}