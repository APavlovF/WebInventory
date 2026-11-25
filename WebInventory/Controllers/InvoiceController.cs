using Microsoft.AspNetCore.Mvc;
using WebInventory.InvoiceAi;

namespace WebInventory.Controllers;

[ApiController]
[Route("api/invoice")]
public class InvoiceController(GeminiParser<InvoiceParserOptions> geminiParser) : InteractiveController
{
    [HttpPost("parse")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB max
    public async Task ParseInvoice([FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            await SendEventAsync("error", new { message = "No invoice file uploaded." }, cancellationToken);

            return;
        }

        string ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".pdf" or ".csv" or ".txt"))
        {
            await SendEventAsync("error",
                new { message = "Unsupported file format. Please upload a PDF, CSV, or TXT file." }, cancellationToken);

            return;
        }

        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream, cancellationToken);
        byte[] fileBytes = memoryStream.ToArray();

        SetHeaders();

        try
        {
            InvoiceExtractionEnvelope items =
                await geminiParser.ParseDocument<InvoiceExtractionEnvelope>(ext, fileBytes, cancellationToken,
                    SendEventAsync);
            await SendEventAsync("result", InvoiceHelper.GetGroupedItems(items), cancellationToken);
        }
        catch (OperationCanceledException)
        {

        }
        catch (TimeoutException)
        {
            await SendEventAsync("error", new { message = "The AI service timed out. Please try again." },
                cancellationToken);
        }
        catch (Exception ex)
        {
            await SendEventAsync("error", new { message = $"Failed to parse invoice: {ex.Message}" },
                cancellationToken);
        }
    }
}