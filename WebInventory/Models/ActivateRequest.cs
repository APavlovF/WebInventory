namespace WebInventory.Models;

public class ActivateRequest
{
    public Guid Token { get; set; }

    public string Password { get; set; }
}