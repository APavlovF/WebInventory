using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System.Linq.Expressions;

namespace WebInventory.Models;

public class Unit : IEntityTypeConfiguration<Unit>, IHasUniqueKey<Unit>
{
    public int Id { get; set; }
    public string Measurement { get; set; }
    public string Name { get; set; }
    public string Sku { get; set; }

    public void Configure(EntityTypeBuilder<Unit> builder)
    {
        builder.Property(u => u.Measurement).HasMaxLength(50);
        builder.Property(u => u.Name).HasMaxLength(200);
        builder.Property(u => u.Sku).HasMaxLength(200);
    }

    public string GetUniqueKey() => (Sku ?? $"{Name}|{Measurement}").Trim();

    public static Expression<Func<Unit, bool>> MatchesUniqueKeyOf(Unit candidate)
    {
        if (!string.IsNullOrWhiteSpace(candidate.Sku))
        {
            string skuLower = candidate.Sku.Trim().ToLower();

            return u => u.Sku != null && u.Sku.Trim().ToLower() == skuLower;
        }

        string nameLower = candidate.Name.Trim().ToLower();
        string measLower = (candidate.Measurement ?? string.Empty).Trim().ToLower();

        return u => u.Name.Trim().ToLower() == nameLower && (u.Measurement ?? "").Trim().ToLower() == measLower;
    }

    public void TrimKeyProperties()
    {
        Measurement = Measurement.Trim();
        Name = Name.Trim();
        if (!string.IsNullOrWhiteSpace(Sku)) Sku = Sku.Trim();
    }
}