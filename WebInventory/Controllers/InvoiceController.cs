using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using WebInventory.InvoiceAi;

namespace WebInventory.Controllers;

[ApiController]
[Route("api/invoice")]
// [Authorize] // Uncomment if only authenticated users can import invoices
public class InvoiceController(InvoiceParser invoiceParser) : ControllerBase
{
    static readonly JsonSerializerOptions CamelCaseOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    [HttpPost("parse")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB max
    public async Task ParseInvoice(
        [FromForm] IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            await SendEventAsync("error", new { message = "No invoice file uploaded." });
            return;
            //return BadRequest("No invoice file uploaded.");
        }

        string ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".pdf" or ".csv" or ".txt"))
        {
            await SendEventAsync("error", new { message = "Unsupported file format. Please upload a PDF, CSV, or TXT file." });
            return;
            //return BadRequest("Unsupported file format. Please upload a PDF, CSV, or TXT file.");
        }

        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream, cancellationToken);
        byte[] fileBytes = memoryStream.ToArray();

        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("X-Accel-Buffering", "no"); // Prevents Nginx/Render buffering

        try
        {
            await SendEventAsync("result",
                await invoiceParser.ParseInvoice(ext, fileBytes, cancellationToken, SendEventAsync));
            //return Ok(await invoiceParser.ParseInvoice(ext, fileBytes, cancellationToken, SendEventAsync));
        }
        catch (OperationCanceledException)
        {

        }
        catch (TimeoutException)
        {
            await SendEventAsync("error", new { message = "The AI service timed out. Please try again." });
        }
        catch (Exception ex)
        {
            await SendEventAsync("error", new { message = $"Failed to parse invoice: {ex.Message}" });
        }

        return;

        async Task SendEventAsync(string eventName, object payload)
        {
            var json = JsonSerializer.Serialize(payload, CamelCaseOptions);
            await Response.WriteAsync($"event: {eventName}\ndata: {json}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
    }
}