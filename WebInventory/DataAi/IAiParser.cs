namespace WebInventory.DataAi;

public interface IAiParser
{
    Task<List<T>> ParseDocument<T>(string ext, byte[] fileBytes, CancellationToken cancellationToken,
        Func<string, object, CancellationToken, Task> sendEventAsync);
}