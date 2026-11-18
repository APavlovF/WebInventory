using Microsoft.AspNetCore.Mvc;
using WebInventory.InvoiceAi;

namespace WebInventory.Controllers;

[ApiController]
[Route("api/invoice")]
// [Authorize] // Uncomment if only authenticated users can import invoices
public class InvoiceController(InvoiceParser invoiceParser) : ControllerBase
{
    [HttpPost("parse")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB max
    public async Task<ActionResult<List<ParsedInvoiceItemDto>>> ParseInvoice(
        [FromForm] IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No invoice file uploaded.");

        string ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".pdf" or ".csv" or ".txt"))
            return BadRequest("Unsupported file format. Please upload a PDF, CSV, or TXT file.");

        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream, cancellationToken);
        byte[] fileBytes = memoryStream.ToArray();

        return Ok(await invoiceParser.ParseInvoice(ext, fileBytes, cancellationToken));
    }
}