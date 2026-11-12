namespace WebInventory.Models;

public class UnitStock
{
    public int Id { get; set; }
    public int Quantity { get; set; }
    public Unit Unit { get; set; }
    public User User { get; set; }
}