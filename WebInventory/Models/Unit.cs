using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace WebInventory.Models;

public class Unit : IEntityTypeConfiguration<Unit>
{
    public int Id { get; set; }
    public string Measurement { get; set; }
    public string Name { get; set; }
    public string Sku { get; set; }
    public User User { get; set; }

    public void Configure(EntityTypeBuilder<Unit> builder)
    {
        builder.Property(u => u.Measurement).HasMaxLength(50);
        builder.Property(u => u.Name).HasMaxLength(200);
        builder.Property(u => u.Sku).HasMaxLength(200);
    }
}