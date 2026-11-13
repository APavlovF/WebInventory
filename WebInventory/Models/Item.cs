using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace WebInventory.Models;

public class Item : IEntityTypeConfiguration<Item>
{
    public int Id { get; set; }
    public decimal Quantity { get; set; }
    public Unit Unit { get; set; }

    public void Configure(EntityTypeBuilder<Item> builder)
    {
        builder.Property(i => i.Quantity).HasPrecision(18, 4);
    }
}