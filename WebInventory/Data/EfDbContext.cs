using Microsoft.EntityFrameworkCore;
using WebInventory.Models;

namespace WebInventory.Data;

public class EfDbContext(DbContextOptions<EfDbContext> options) : DbContext(options)
{
    public DbSet<Company> Companies { get; set; }
    public DbSet<Invitation> Invitations { get; set; }
    public DbSet<Item> Items { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<Unit> Units { get; set; }
    public DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(GetType().Assembly);
        base.OnModelCreating(modelBuilder);
    }
}