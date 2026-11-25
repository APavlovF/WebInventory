using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.Options;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using WebInventory.DataAi;
using WebInventory.Services;

namespace WebInventory.InvoiceAi;

public class GeminiParser<TOpt>(Client geminiClient, IOptions<TOpt> options) : IAiParser where TOpt : ParserOptions
{
    public async Task<T> ParseDocument<T>(string ext, byte[] fileBytes, CancellationToken cancellationToken,
        Func<string, object, CancellationToken, Task> sendEventAsync)
    {
        await sendEventAsync("status", new { message = "Uploading document..." }, cancellationToken);
        List<Part> parts =
        [
            Part.FromText(options.Value.Prompt),
            await GetTextPart()
        ];

        GenerateContentConfig config = new GenerateContentConfig
        {
            ResponseMimeType = "application/json"
        };

        GenerateContentResponse response = null;
        foreach (string modelName in options.Value.CandidateModels)
        {
            for (int attempt = 1; attempt <= 2; attempt++)
            {
                await sendEventAsync("status",
                    new { message = $"Attempt {attempt}: extracting document contents with {modelName}..." }, cancellationToken);
                try
                {
                    response = await geminiClient.Models.GenerateContentAsync(
                        model: modelName,
                        contents: [new Content { Role = "user", Parts = parts }],
                        config: config,
                        cancellationToken: cancellationToken
                    );
                    break;
                }
                catch (ServerError)
                {
                    await Task.Delay(1000 * attempt, cancellationToken);
                }
            }

            if (response != null) break;
        }

        if (response == null)
        {
            await sendEventAsync("status",
                new { message = "AI service is temporarily busy. Please try again shortly." }, cancellationToken);
            return default;
        }

        string json = response.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text ?? "{}";
        T extracted = JsonSerializer.Deserialize<T>(json,
            new JsonSerializerOptions
            { PropertyNameCaseInsensitive = true, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull });

        await sendEventAsync("status", new { message = "Finalizing items..." }, cancellationToken);

        return extracted;

        async Task<Part> GetTextPart()
        {
            if (ext != ".pdf") return Part.FromText(Encoding.UTF8.GetString(fileBytes));
            await sendEventAsync("status", new { message = "Extracting text from PDF..." }, cancellationToken);
            string extractedText = PdfService.ExtractText(fileBytes);
            if (extractedText.Length >= 30)
            {
                return Part.FromText(extractedText);
            }

            // Fallback for scanned/image-only PDFs
            await sendEventAsync("status", new { message = "Scanned PDF detected, running AI vision..." }, cancellationToken);
            return Part.FromBytes(fileBytes, "application/pdf");

        }
    }
}