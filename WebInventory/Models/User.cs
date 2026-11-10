using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace WebInventory.Models;

public class User : IEntityTypeConfiguration<User>
{
    public int Id { get; set; }
    public bool IsActivated { get; set; }
    public string Email { get; set; }
    public string PasswordHash { get; set; }

    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.Property(u => u.Email).HasMaxLength(500);
        builder.Property(u => u.PasswordHash).HasMaxLength(1000);
    }
}