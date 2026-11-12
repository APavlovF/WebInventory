namespace WebInventory.Models;

public class ProductStock
{
    public int Id { get; set; }
    public Product Product { get; set; }
    public int Quantity { get; set; }
    public User User { get; set; }
    public int UserId { get; set; }
}