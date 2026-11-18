namespace WebInventory.InvoiceAi;

public class InvoiceParserOptions
{
    public const string SectionName = "InvoiceParser";

    public string[] CandidateModels { get; set; } = [];
    public string Prompt { get; set; } = string.Empty;
}