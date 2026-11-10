namespace WebInventory.Data;

public class DapperDbContext(IConfiguration configuration)
{
    public string GetConnectionString() => configuration.GetConnectionString("DefaultConnection");
}