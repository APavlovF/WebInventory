using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using WebInventory.Services;

namespace WebInventory.Controllers;

public class InteractiveController : ControllerBase
{
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