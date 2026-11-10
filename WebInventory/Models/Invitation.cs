using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace WebInventory.Models;

public class Invitation : IEntityTypeConfiguration<Invitation>
{
    public DateTime ExpiresUtc { get; set; }
    public int Id { get; set; }
    public string Login { get; set; }
    public Guid Token { get; set; }
    public bool Used { get; set; }

    public void Configure(EntityTypeBuilder<Invitation> builder)
    {
        builder.Property(i => i.Login).HasMaxLength(500);
    }
}