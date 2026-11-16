using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace WebInventory.Models;

public class Product : IEntityTypeConfiguration<Product>
{
    public int Id { get; set; }
    public decimal[] Commissions { get; set; }
    public string Name { get; set; }
    public List<Item> Items { get; set; }
    public decimal Markup { get; set; } = 1m;
    public decimal Price { get; set; }
    public decimal[] RetailCommissions { get; set; }
    public decimal RetailPrice => RetailCommissions?.Aggregate(Price, ApplyRate) ?? Price;
    public string Sku { get; set; }
    public User User { get; set; }
    public int UserId { get; set; }
    public decimal WorkCost { get; set; }

    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.Property(p => p.Commissions).HasColumnType("numeric(18,4)[]");
        builder.Property(p => p.Markup).HasPrecision(18, 4);
        builder.Property(p => p.Name).HasMaxLength(1000);
        builder.Property(u => u.Price).HasPrecision(18, 2);
        builder.Property(p => p.RetailCommissions).HasColumnType("numeric(18,4)[]");
        builder.Property(p => p.Sku).HasMaxLength(200);
        builder.Property(p => p.WorkCost).HasPrecision(18, 2);
    }

    public decimal GetWholeSalePrice(Dictionary<int, decimal> unitPrices)
    {
        decimal price = Items.Sum(i => unitPrices.GetValueOrDefault(i.Unit.Id, 0));
        price += WorkCost;
        price *= Markup;
        price = Commissions?.Aggregate(price, ApplyRate) ?? price;

        return price;
    }

    static decimal ApplyRate(decimal currentPrice, decimal rate) =>
        rate switch
        {
            0m => currentPrice,
            < 0m => currentPrice / (1m - Math.Abs(rate)),
            _ => currentPrice * (1m + rate)
        };
}