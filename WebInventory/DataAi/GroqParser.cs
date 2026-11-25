using Google.GenAI;
using Microsoft.Extensions.Options;
using System.Text.Json;
using WebInventory.Services;

namespace WebInventory.DataAi;

public class GroqParser<TOpt>(IAiClient aiClient, IOptions<TOpt> options) : IAiParser where TOpt : ParserOptions
{
    public async Task<T> ParseDocument<T>(string ext, byte[] fileBytes, CancellationToken cancellationToken,
        Func<string, object, CancellationToken, Task> sendEventAsync)
    {
        foreach (string modelName in options.Value.CandidateModels)
        {
            try
            {
                string json = await aiClient.GenerateJsonAsync(options.Value.Prompt, modelName, cancellationToken);

                return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
            }
            catch (ServerError)
            {
                await Task.Delay(1000, cancellationToken);
            }
            catch (Exception)
            {
                // ignored
            }
        }

        return default;
    }
}