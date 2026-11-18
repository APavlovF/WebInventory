using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.Options;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using WebInventory.Services;

namespace WebInventory.InvoiceAi;

public class InvoiceParser(Client geminiClient, IOptions<InvoiceParserOptions> options)
{
    public async Task<List<ParsedInvoiceItemDto>> ParseInvoice(string ext,
        byte[] fileBytes,
        CancellationToken cancellationToken, Func<string, object, Task> sendEventAsync)
    {
        await sendEventAsync("status", new { message = "Uploading invoice..." });
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
                    new { message = $"Attempt {attempt}: extracting document contents with {modelName}..." });
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
                new { message = "AI service is temporarily busy. Please try again shortly." });
            return [];
        }

        string json = response.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text ?? "{}";
        InvoiceExtractionEnvelope extracted = JsonSerializer.Deserialize<InvoiceExtractionEnvelope>(
            json,
            new JsonSerializerOptions
            { PropertyNameCaseInsensitive = true, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull }
        );

        await sendEventAsync("status", new { message = "Finalizing items..." });

        return InvoiceHelper.GetGroupedItems(extracted);

        async Task<Part> GetTextPart()
        {
            if (ext != ".pdf") return Part.FromText(Encoding.UTF8.GetString(fileBytes));
            await sendEventAsync("status", new { message = "Extracting text from PDF..." });
            string extractedText = PdfService.ExtractText(fileBytes);
            if (extractedText.Length >= 30)
            {
                return Part.FromText(extractedText);
            }

            // Fallback for scanned/image-only PDFs
            await sendEventAsync("status", new { message = "Scanned PDF detected, running AI vision..." });
            return Part.FromBytes(fileBytes, "application/pdf");

        }
    }
}