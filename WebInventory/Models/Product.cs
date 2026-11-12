using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace WebInventory.Models;

public class Product : IEntityTypeConfiguration<Product>
{
    public int Id { get; set; }
    public string Name { get; set; }
    public List<Item> Items { get; set; }
    public string Sku { get; set; }

    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.Property(p => p.Name).HasMaxLength(1000);
        builder.Property(p => p.Sku).HasMaxLength(200);
    }
}