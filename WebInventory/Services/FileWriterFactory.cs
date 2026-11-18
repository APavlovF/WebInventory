namespace WebInventory.Services;

public class FileWriterFactory : IFileWriterFactory
{
    readonly Dictionary<string, IFileWriter> _writers;

    public FileWriterFactory(IEnumerable<IFileWriter> writers) =>
        _writers = writers.ToDictionary(w => w.Format, StringComparer.OrdinalIgnoreCase);

    public IFileWriter GetWriter(string format)
    {
        if (string.IsNullOrWhiteSpace(format) || !_writers.TryGetValue(format.Trim(), out IFileWriter writer))
        {
            throw new NotSupportedException($"Export format '{format}' is not supported.");
        }

        return writer;
    }
}