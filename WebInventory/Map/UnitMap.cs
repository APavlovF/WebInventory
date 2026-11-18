using WebInventory.Models;

namespace WebInventory.Map;

public class UnitMap
{
    public static List<ColumnDefinition<UnitStock>> Columns =
    [
        new("Name", x => x.Unit?.Name),
        new("SKU", x => x.Unit?.Sku),
        new("Quantity", x => x.Quantity),
        new("Price", x => x.Price)
    ];
}