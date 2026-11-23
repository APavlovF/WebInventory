using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System.Linq.Expressions;

namespace WebInventory.Models;

public class Product : IEntityTypeConfiguration<Product>, IHasUniqueKey<Product>
{
    public int Id { get; set; }
    public List<Commission> Commissions { get; set; }
    public string Name { get; set; }
    public bool IsDeleted { get; set; }
    public List<Item> Items { get; set; }
    public decimal Markup { get; set; } = 1;
    public decimal Price { get; set; }
    public decimal RetailRate { get; set; } = 1;
    public decimal RetailPrice => Price * RetailRate;
    public string Sku { get; set; }
    public User User { get; set; }
    public int UserId { get; set; }
    public decimal WorkCost { get; set; }

    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.Property(p => p.Markup).HasPrecision(18, 4);
        builder.Property(p => p.Name).HasMaxLength(1000);
        builder.Property(u => u.Price).HasPrecision(18, 2);
        builder.Property(p => p.RetailRate).HasPrecision(18, 4);
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

    static decimal ApplyRate(decimal currentPrice, Commission commission) =>
        commission.Rate switch
        {
            0m => currentPrice,
            < 0m => currentPrice / (1m - Math.Abs(commission.Rate)),
            _ => currentPrice * (1m + commission.Rate)
        };

    public string GetUniqueKey() => (Sku ?? Name).Trim();

    public static Expression<Func<Product, bool>> MatchesUniqueKeyOf(Product candidate)
    {
        string sku = candidate.Sku?.Trim();
        string name = candidate.Name.Trim();
        if (!string.IsNullOrEmpty(sku))
        {
            string skuLower = sku.ToLower();

            return p => p.Sku != null && p.Sku.ToLower() == skuLower;
        }

        string nameLower = name.ToLower();

        return p => p.Name.ToLower() == nameLower;
    }

    public void TrimKeyProperties()
    {
        Name = Name.Trim();
        if (!string.IsNullOrWhiteSpace(Sku)) Sku = Sku.Trim();
    }
}