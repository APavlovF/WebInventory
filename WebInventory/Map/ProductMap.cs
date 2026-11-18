using WebInventory.Models;

namespace WebInventory.Map;

public class ProductMap
{
    public static List<ColumnDefinition<ProductStock>> Columns =
    [
        new("Product Name", x => x.Product?.Name),
        new("SKU", x => x.Product?.Sku),
        new("Quantity", x => x.Quantity),
        new("Price", x => x.Product.Price),
        new("Retail Price", x => x.Product.RetailPrice)
    ];
}