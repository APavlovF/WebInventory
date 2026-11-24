namespace WebInventory.Services;

public abstract class ParserOptions
{
    public string[] CandidateModels { get; set; } = [];
    public string Prompt { get; set; } = string.Empty;
}