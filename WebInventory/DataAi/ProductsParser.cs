using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.Options;
using System.Diagnostics;
using System.Text.Json;
using WebInventory.Models;
using WebInventory.Services;

namespace WebInventory.DataAi;

public class ProductsParser(Client geminiClient, IOptions<ProductsParserOptions> options)
{
    public async Task<List<Product>> ParseProductsAsync(string fileContent, string fileName, List<Unit> availableUnits)
    {
        string serializedUnits = JsonSerializer.Serialize(availableUnits, JsonService.JsonOptions);
        string prompt = $"{options.Value.Prompt}\n\nAvailable Units:\n{serializedUnits}\n\nFile ({fileName}):\n{fileContent}";
        GenerateContentConfig config = new GenerateContentConfig
        {
            ResponseMimeType = "application/json",
            ResponseSchema = new Schema
            {
                Type = Google.GenAI.Types.Type.Array,
                Items = new Schema
                {
                    Type = Google.GenAI.Types.Type.Object,
                    Properties = new Dictionary<string, Schema>
                    {
                        ["name"] = new() { Type = Google.GenAI.Types.Type.String },
                        ["sku"] = new() { Type = Google.GenAI.Types.Type.String },
                        ["price"] = new() { Type = Google.GenAI.Types.Type.Number },
                        ["retailRate"] = new() { Type = Google.GenAI.Types.Type.Number },
                        ["items"] = new()
                        {
                            Type = Google.GenAI.Types.Type.Array,
                            Items = new Schema
                            {
                                Type = Google.GenAI.Types.Type.Object,
                                Properties = new Dictionary<string, Schema>
                                {
                                    ["quantity"] = new() { Type = Google.GenAI.Types.Type.Number },
                                    ["unit"] = new()
                                    {
                                        Type = Google.GenAI.Types.Type.Object,
                                        Properties = new Dictionary<string, Schema>
                                        {
                                            ["id"] = new() { Type = Google.GenAI.Types.Type.Integer },
                                            ["name"] = new() { Type = Google.GenAI.Types.Type.String },
                                            ["measurement"] = new() { Type = Google.GenAI.Types.Type.String },
                                            ["sku"] = new() { Type = Google.GenAI.Types.Type.String }
                                        },
                                        Required = ["id", "name", "measurement", "sku"]
                                    }
                                },
                                Required = ["quantity", "unit"]
                            }
                        },
                        ["commissions"] = new()
                        {
                            Type = Google.GenAI.Types.Type.Array,
                            Items = new Schema
                            {
                                Type = Google.GenAI.Types.Type.Object,
                                Properties = new Dictionary<string, Schema>
                                {
                                    ["name"] = new() { Type = Google.GenAI.Types.Type.String },
                                    ["rate"] = new() { Type = Google.GenAI.Types.Type.Number }
                                },
                                Required = ["name", "rate"]
                            }
                        }
                    },
                    Required = ["name", "sku", "price", "retailRate", "items", "commissions"]
                }
            }
        };

        foreach (string candidateModel in options.Value.CandidateModels)
        {
            try
            {
                GenerateContentResponse response = await geminiClient.Models.GenerateContentAsync(
                    model: candidateModel,
                    contents: prompt,
                    config: config
                );

                string json = response.Candidates?[0].Content?.Parts?[0].Text;
                if (!string.IsNullOrWhiteSpace(json) && json != "[]")
                {
                    return JsonSerializer.Deserialize<List<Product>>(json, JsonService.JsonOptions) ?? [];
                }
            }
            catch (Exception e)
            {
                Debug.WriteLine($"{candidateModel}: {e.Message}");
            }
        }

        return [];
    }
}