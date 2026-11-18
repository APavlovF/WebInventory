namespace WebInventory.InvoiceAi;

public class InvoiceExtractionEnvelope
{
    public List<ParsedInvoiceItemDto> Items { get; set; }
    public decimal GrandTotal { get; set; }
}