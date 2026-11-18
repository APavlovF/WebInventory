using WebInventory.Models;

namespace WebInventory.Services;

public class CsvWriter : IFileWriter
{
    public string ContentType => "text/csv";
    public string Format => "csv";

    public async Task<byte[]> Write<T>(IEnumerable<T> lines, List<ColumnDefinition<T>> columns) where T : class
    {
        using var memoryStream = new MemoryStream();
        await using StreamWriter writer = new StreamWriter(memoryStream);
        // Write Headers
        await writer.WriteLineAsync(string.Join(",", columns.Select(c => EscapeCsv(c.Header))));
        // Write Rows
        foreach (T item in lines)
        {
            IEnumerable<string> rowValues = columns.Select(col =>
            {
                string rawValue = col.ValueSelector(item)?.ToString() ?? string.Empty;
                return EscapeCsv(rawValue);
            });

            await writer.WriteLineAsync(string.Join(",", rowValues));
        }

        await writer.FlushAsync();

        return memoryStream.ToArray();
    }

    static string EscapeCsv(string value) => value.Contains(',') || value.Contains('"') || value.Contains('\n')
        ? $"\"{value.Replace("\"", "\"\"")}\""
        : value;
}