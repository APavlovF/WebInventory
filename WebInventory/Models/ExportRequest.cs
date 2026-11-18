namespace WebInventory.Models;

public class ExportRequest<T>
{
    public string Format { get; set; }
    public List<T> Items { get; set; }
}