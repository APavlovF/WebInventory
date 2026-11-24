using System.Text.Json;

namespace WebInventory.Services;

public class JsonService
{
    public static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };
}