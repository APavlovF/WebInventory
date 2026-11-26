using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace WebInventory.Models;

public class Invitation : IEntityTypeConfiguration<Invitation>
{
    public bool EmailSent { get; set; }
    public DateTime ExpiresUtc { get; set; }
    public int Id { get; set; }
    public string Login { get; set; }
    public string SubscriptionId { get; set; }
    public Guid Token { get; set; }
    public bool Used { get; set; }

    public void Configure(EntityTypeBuilder<Invitation> builder)
    {
        builder.Property(i => i.Login).HasMaxLength(500);
        builder.Property(i => i.SubscriptionId).HasMaxLength(200);
    }
}