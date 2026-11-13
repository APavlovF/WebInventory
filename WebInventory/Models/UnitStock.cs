using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace WebInventory.Models;

public class UnitStock : IEntityTypeConfiguration<UnitStock>
{
    public int Id { get; set; }
    public decimal LowStockAlert { get; set; }
    public int MaxStockAlert { get; set; }
    public decimal Quantity { get; set; }
    public Unit Unit { get; set; }
    public User User { get; set; }
    public int UserId { get; set; }

    public void Configure(EntityTypeBuilder<UnitStock> builder)
    {
        builder.Property(u => u.Quantity).HasPrecision(18, 4);
    }
}