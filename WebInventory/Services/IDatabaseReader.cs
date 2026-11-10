namespace WebInventory.Services;

public interface IDatabaseReader
{
    Task<IEnumerable<T>> Read<T>() where T : class;
}