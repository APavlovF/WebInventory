namespace WebInventory.Services;

public interface IAiClient
{
    Task<string> GenerateJsonAsync(string prompt, string model, CancellationToken cancellationToken);
}