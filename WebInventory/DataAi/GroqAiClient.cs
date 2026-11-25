using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using WebInventory.Services;

namespace WebInventory.DataAi;

public class GroqAiClient(HttpClient httpClient, IOptions<GroqOptions> options) : IAiClient
{
    public async Task<string> GenerateJsonAsync(string prompt, string model, CancellationToken cancellationToken)
    {
        using HttpRequestMessage request = new(HttpMethod.Post, "chat/completions");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.Value.ApiKey);
        request.Content = JsonContent.Create(new
        {
            model,
            temperature = 0,
            response_format = new
            {
                type = "json_object"
            },
            messages = new[]
            {
                new
                {
                    role = "user",
                    content = prompt
                }
            }
        });

        using HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
        string body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new Exception($"Groq error {(int)response.StatusCode}: {body}");
        }
        response.EnsureSuccessStatusCode();
        GroqChatResponse result = await response.Content.ReadFromJsonAsync<GroqChatResponse>(cancellationToken);

        return result?.Choices.FirstOrDefault()?.Message?.Content ?? "{}";
    }
}