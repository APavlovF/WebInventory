using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace WebInventory.Models;

public class Company : IEntityTypeConfiguration<Company>
{
    public int Id { get; set; }
    public string Name { get; set; }
    public User User { get; set; }

    public void Configure(EntityTypeBuilder<Company> builder)
    {
        builder.Property(c => c.Name).HasMaxLength(1000);
    }
}