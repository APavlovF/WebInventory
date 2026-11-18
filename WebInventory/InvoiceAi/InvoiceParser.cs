using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.Options;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace WebInventory.InvoiceAi;

public class InvoiceParser(Client geminiClient, IOptions<InvoiceParserOptions> options)
{
    public async Task<List<ParsedInvoiceItemDto>> ParseInvoice(
        string ext,
        byte[] fileBytes,
        CancellationToken cancellationToken)
    {
        List<Part> parts =
        [
            Part.FromText(options.Value.Prompt),
            ext == ".pdf"
                ? Part.FromBytes(fileBytes, "application/pdf")
                : Part.FromText(Encoding.UTF8.GetString(fileBytes))
        ];

        GenerateContentConfig config = new GenerateContentConfig
        {
            ResponseMimeType = "application/json"
        };

        GenerateContentResponse response = null;
        foreach (var modelName in options.Value.CandidateModels)
        {
            for (int attempt = 1; attempt <= 2; attempt++)
            {
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

        if (response == null) return [];
        //return StatusCode(503, $"AI service is temporarily busy. Please try again shortly. ({lastError?.Message})");

        string json = response.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text ?? "{}";
        InvoiceExtractionEnvelope extracted = JsonSerializer.Deserialize<InvoiceExtractionEnvelope>(
            json,
            new JsonSerializerOptions
            { PropertyNameCaseInsensitive = true, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull }
        );

        // Normalize negative quantities (e.g. qty -1, price 10 -> qty 1, price -10) so UI validation (qty > 0) passes
        List<ParsedInvoiceItemDto> rawItems = (extracted?.Items ?? [])
            .Where(i => i.Unit != null && !string.IsNullOrWhiteSpace(i.Unit.Name) && i.Quantity != 0)
            .Select(i => i.Quantity < 0
                ? new ParsedInvoiceItemDto { Quantity = Math.Abs(i.Quantity), Price = -i.Price, Unit = i.Unit }
                : i)
            .ToList();

        if (rawItems.Count == 0) return [];

        // 1. Distribute taxes/fees only when both linesSubtotal and grandTotal are positive and differ
        decimal linesSubtotal = rawItems.Sum(i => i.Quantity * i.Price);
        decimal grandTotal = extracted?.GrandTotal ?? 0m;
        decimal multiplier = 1m;
        if (linesSubtotal > 0m && grandTotal > 0m && Math.Abs(grandTotal - linesSubtotal) > 0.005m)
        {
            multiplier = grandTotal / linesSubtotal;
        }

        // 2. Group items with the same normalized Name and Measurement
        List<ParsedInvoiceItemDto> groupedItems = rawItems
            .GroupBy(i => (
                Name: i.Unit?.Name?.Trim().ToLowerInvariant(),
                Measurement: string.IsNullOrWhiteSpace(i.Unit?.Measurement)
                    ? "pcs"
                    : i.Unit.Measurement.Trim().ToLowerInvariant()
            ))
            .Select(group =>
            {
                var first = group.First();
                var cleanName = first.Unit?.Name?.Trim();
                var cleanMeasurement = string.IsNullOrWhiteSpace(first.Unit?.Measurement)
                    ? "pcs"
                    : first.Unit.Measurement.Trim();

                decimal totalQuantity = group.Sum(x => x.Quantity);
                decimal totalGroupCost = group.Sum(x => x.Quantity * x.Price * multiplier);

                // Round to 2 decimal places (cents)
                var weightedAvgUnitPrice = totalQuantity > 0m
                    ? Math.Round(totalGroupCost / totalQuantity, 2, MidpointRounding.AwayFromZero)
                    : 0m;

                return new ParsedInvoiceItemDto
                {
                    Unit = new ParsedUnitDto { Name = cleanName, Measurement = cleanMeasurement },
                    Quantity = totalQuantity,
                    Price = weightedAvgUnitPrice
                };
            })
            .ToList();

        return groupedItems;
    }
}