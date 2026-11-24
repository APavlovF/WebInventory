namespace WebInventory.Services;

public interface IAiClient
{
    Task<string> PromptAsync(string prompt);
}