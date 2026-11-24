using System.Diagnostics;
using System.Text.Json;
using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.Options;
using WebInventory.Models;
using WebInventory.Services;
using SchemaType = Google.GenAI.Types.Type;

namespace WebInventory.DataAi;

public class MaterialsParser(Client geminiClient, IOptions<MaterialsParserOptions> options)
{
    public async Task<List<UnitStock>> ParseMaterialsAsync(string fileContent, string fileName)
    {
        string prompt = $"{options.Value.Prompt}\n\nFile ({fileName}):\n{fileContent}";
        GenerateContentConfig config = new GenerateContentConfig
        {
            ResponseMimeType = "application/json",
            ResponseSchema = new Schema
            {
                Type = SchemaType.Array,
                Items = new Schema
                {
                    Type = SchemaType.Object,
                    Properties = new Dictionary<string, Schema>
                    {
                        ["quantity"] = new() { Type = SchemaType.Number },
                        ["price"] = new() { Type = SchemaType.Number },
                        ["lowStockAlert"] = new() { Type = SchemaType.Number },
                        ["maxStockAlert"] = new() { Type = SchemaType.Number },
                        ["unit"] = new()
                        {
                            Type = SchemaType.Object,
                            Properties = new Dictionary<string, Schema>
                            {
                                ["name"] = new() { Type = SchemaType.String },
                                ["measurement"] = new() { Type = SchemaType.String },
                                ["sku"] = new() { Type = SchemaType.String }
                            },
                            Required = ["name", "measurement", "sku"]
                        }
                    },
                    Required = ["quantity", "price", "lowStockAlert", "maxStockAlert", "unit"]
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
                    return JsonSerializer.Deserialize<List<UnitStock>>(json, JsonService.JsonOptions) ?? [];
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