namespace WebInventory.Services;

public interface IFileWriterFactory
{
    IFileWriter GetWriter(string format);
}