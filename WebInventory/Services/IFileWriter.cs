using WebInventory.Models;

namespace WebInventory.Services;

public interface IFileWriter
{
    string ContentType { get; }
    string Format { get; }

    Task<byte[]> Write<T>(IEnumerable<T> lines, List<ColumnDefinition<T>> columns) where T : class;
}