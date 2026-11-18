namespace WebInventory.Models;

public record ColumnDefinition<T>(string Header, Func<T, object?> ValueSelector);