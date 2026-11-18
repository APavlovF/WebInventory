using System.Text;
using WebInventory.Models;

namespace WebInventory.Services;

public class TxtFileWriter : IFileWriter
{
    public string Format => "txt";
    public string ContentType => "text/plain; charset=utf-8";

    public async Task<byte[]> Write<T>(IEnumerable<T> lines, List<ColumnDefinition<T>> columns) where T : class
    {
        if (columns.Count == 0) return [];

        // 1. Extract all string values upfront so we can measure column widths
        List<string[]> rows =
        [
            .. lines.Select(item => columns.Select(col => Sanitize(col.ValueSelector(item)?.ToString())).ToArray())
        ];

        // 2. Calculate the max width needed for each column (header vs. longest cell)
        int[] columnWidths = new int[columns.Count];
        for (int i = 0; i < columns.Count; i++)
        {
            int headerLength = columns[i].Header.Length;
            int maxRowLength = rows.Count > 0 ? rows.Max(r => r[i].Length) : 0;
            columnWidths[i] = Math.Max(headerLength, maxRowLength);
        }

        using MemoryStream memoryStream = new MemoryStream();
        await using StreamWriter writer = new StreamWriter(memoryStream, Encoding.UTF8);

        // 3. Write Header Row
        await writer.WriteLineAsync(FormatRow([.. columns.Select(c => c.Header)], columnWidths));

        // 4. Write Separator Line (e.g., -------- | --------)
        string[] separators = columnWidths.Select(w => new string('-', w)).ToArray();
        await writer.WriteLineAsync(FormatRow(separators, columnWidths));

        // 5. Write Data Rows
        foreach (string[] row in rows)
        {
            await writer.WriteLineAsync(FormatRow(row, columnWidths));
        }

        await writer.FlushAsync();

        return memoryStream.ToArray();
    }

    static string FormatRow(string[] values, int[] widths)
    {
        IEnumerable<string> paddedCells = values.Select((val, index) => val.PadRight(widths[index]));

        return string.Join(" | ", paddedCells);
    }

    // Replace line breaks so multi-line product names don't break table alignment
    static string Sanitize(string value) => string.IsNullOrEmpty(value)
        ? string.Empty
        : value.Replace("\r\n", " ").Replace("\n", " ").Replace("\r", " ");
}