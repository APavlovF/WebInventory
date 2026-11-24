using WebInventory.Services;

namespace WebInventory.InvoiceAi;

public class InvoiceParserOptions : ParserOptions, IParserOptions
{
    public static string SectionName => "InvoiceParser";
}