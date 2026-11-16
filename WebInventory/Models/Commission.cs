using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace WebInventory.Models;

public class Commission : IEntityTypeConfiguration<Commission>
{
    public int Id { get; set; }
    public string Name { get; set; }
    public decimal Rate { get; set; }
    public User User { get; set; }
    public int UserId { get; set; }

    public void Configure(EntityTypeBuilder<Commission> builder)
    {
        builder.Property(c => c.Name).HasMaxLength(200);
        builder.Property(c => c.Rate).HasPrecision(18, 4);
    }
}