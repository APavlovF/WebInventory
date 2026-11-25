namespace WebInventory.DataAi;

public class ParserDataOutput<T> where T : class
{
    public List<T> Items { get; set; } = [];
}