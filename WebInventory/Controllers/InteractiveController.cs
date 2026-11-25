using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using WebInventory.DataAi;
using WebInventory.Services;

namespace WebInventory.Controllers;

public class InteractiveController : ControllerBase
{
    protected async Task ImportData<T>(IAiParser parser, IFormFile file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            await SendEventAsync("error", new { message = "No invoice file uploaded." }, cancellationToken);

            return;
        }

        string ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream, cancellationToken);
        byte[] fileBytes = memoryStream.ToArray();

        SetHeaders();

        try
        {
            await SendEventAsync("result",
                await parser.ParseDocument<T>(ext, fileBytes, cancellationToken, SendEventAsync), cancellationToken);
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

    protected async Task SendEventAsync(string eventName, object payload, CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(payload, JsonService.CamelCaseOptions);
        await Response.WriteAsync($"event: {eventName}\ndata: {json}\n\n", cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
    }

    protected void SetHeaders()
    {
        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("X-Accel-Buffering", "no");
    }
}