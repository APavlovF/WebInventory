using MiniExcelLibs;
using WebInventory.Models;

namespace WebInventory.Services;

public class XlsxFileWriter : IFileWriter
{
    public string Format => "xlsx";
    public string ContentType => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    public async Task<byte[]> Write<T>(IEnumerable<T> lines, List<ColumnDefinition<T>> columns) where T : class
    {
        // Project each item into a dictionary of { "Header Name": cellValue }
        // MiniExcel automatically uses the dictionary keys as Excel column headers
        IEnumerable<Dictionary<string, object>> rows = lines.Select(item =>
        {
            Dictionary<string, object> row = new Dictionary<string, object>(columns.Count);
            foreach (ColumnDefinition<T> col in columns)
            {
                row[col.Header] = col.ValueSelector(item);
            }
            return row;
        });

        using MemoryStream memoryStream = new MemoryStream();
        await memoryStream.SaveAsAsync(rows);
        
        return memoryStream.ToArray();
    }
}