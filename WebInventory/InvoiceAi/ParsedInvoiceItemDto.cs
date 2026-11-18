namespace WebInventory.InvoiceAi;

public class ParsedInvoiceItemDto
{
    public ParsedUnitDto? Unit { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? Price { get; set; }
}