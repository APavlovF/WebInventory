namespace WebInventory.InvoiceAi;

public class InvoiceHelper
{
    public static List<ParsedInvoiceItemDto> GetGroupedItems(InvoiceExtractionEnvelope extracted)
    {
        List<ParsedInvoiceItemDto> rawItems =
        [
            .. (extracted?.Items ?? [])
            .Where(i => i.Unit != null && !string.IsNullOrWhiteSpace(i.Unit.Name) && i.Quantity != 0)
            .Select(i => i.Quantity < 0
                ? new ParsedInvoiceItemDto { Quantity = Math.Abs(i.Quantity ?? 0), Price = -i.Price, Unit = i.Unit }
                : i)
        ];

        if (rawItems.Count == 0) return [];

        // 1. Distribute taxes/fees only when both linesSubtotal and grandTotal are positive and differ
        decimal linesSubtotal = rawItems.Sum(i => i.Quantity * i.Price) ?? 0;
        decimal grandTotal = extracted?.GrandTotal ?? 0m;
        decimal multiplier = 1m;
        if (linesSubtotal > 0m && grandTotal > 0m && Math.Abs(grandTotal - linesSubtotal) > 0.005m)
        {
            multiplier = grandTotal / linesSubtotal;
        }

        // 2. Group items with the same normalized Name and Measurement
        List<ParsedInvoiceItemDto> groupedItems =
        [
            .. rawItems
                .GroupBy(i => (
                    Name: i.Unit?.Name?.Trim().ToLowerInvariant(),
                    Measurement: string.IsNullOrWhiteSpace(i.Unit?.Measurement)
                        ? "pcs"
                        : i.Unit.Measurement.Trim().ToLowerInvariant()
                ))
                .Select(group =>
                {
                    ParsedInvoiceItemDto first = group.First();
                    string cleanName = first.Unit?.Name?.Trim();
                    string cleanMeasurement = string.IsNullOrWhiteSpace(first.Unit?.Measurement)
                        ? "pcs"
                        : first.Unit.Measurement.Trim();

                    decimal totalQuantity = group.Sum(x => x.Quantity) ?? 0;
                    decimal totalGroupCost = group.Sum(x => x.Quantity * x.Price * multiplier) ?? 0;

                    // Round to 2 decimal places (cents)
                    decimal weightedAvgUnitPrice = totalQuantity > 0m
                        ? Math.Round(totalGroupCost / totalQuantity, 2, MidpointRounding.AwayFromZero)
                        : 0m;

                    return new ParsedInvoiceItemDto
                    {
                        Unit = new ParsedUnitDto { Name = cleanName, Measurement = cleanMeasurement },
                        Quantity = totalQuantity,
                        Price = weightedAvgUnitPrice
                    };
                })
        ];

        return groupedItems;
    }
}