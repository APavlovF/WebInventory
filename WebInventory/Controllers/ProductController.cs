using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using WebInventory.Data;
using WebInventory.Models;

namespace WebInventory.Controllers;

[ApiController]
[Route("api/product")]
public class ProductController(EfDbContext context) : ControllerBase
{
    [Authorize]
    [HttpPost("batch-sell")]
    public async Task<IActionResult> CreateBatchAndSell([FromBody] List<ProductStock> products) =>
        await ProcessBatchAsync(products, saveProducts: false);

    [Authorize]
    [HttpPost("batch")]
    public async Task<IActionResult> AddBatch([FromBody] List<ProductStock> products) =>
        await ProcessBatchAsync(products, saveProducts: true);

    [Authorize]
    [HttpPost("add")]
    public async Task<IActionResult> CreateProduct([FromBody] Product product)
    {
        if (product == null)
        {
            return BadRequest("Product data is required.");
        }

        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        string normalizedName = product.GetUniqueKey();

        // Resolve units first so validation fails early if any unit is invalid
        foreach (Item item in product.Items)
        {
            Unit existingUnit = await context.Units.SingleOrDefaultAsync(u => u.Id == item.Unit.Id);
            if (existingUnit == null)
            {
                return BadRequest($"Unit {item.Unit.Id} does not exist.");
            }

            item.Unit = existingUnit;
        }

        List<Commission> resolvedCommissions = await ResolveCommissions(product.Commissions, userId);
        // Check if product already exists for this user (match by Name, or add Sku check if needed)
        Product existingProduct = await context.Products
            .Include(p => p.Items)
            .Include(p => p.Commissions)
            .Where(p => p.UserId == userId)
            .Where(Product.MatchesUniqueKeyOf(product))
            .FirstOrDefaultAsync();

        product.TrimKeyProperties();
        if (existingProduct != null)
        {
            if (!existingProduct.IsDeleted)
            {
                return Conflict($"Product '{normalizedName}' already exists.");
            }

            // Restore and update the soft-deleted product
            existingProduct.IsDeleted = false;
            existingProduct.Name = product.Name;
            existingProduct.Sku = product.Sku;
            existingProduct.Price = product.Price;
            existingProduct.RetailRate = product.RetailRate;

            existingProduct.Items.Clear();
            foreach (Item item in product.Items)
            {
                existingProduct.Items.Add(item);
            }

            existingProduct.Commissions.Clear();
            foreach (Commission commission in resolvedCommissions)
            {
                existingProduct.Commissions.Add(commission);
            }

            await context.SaveChangesAsync();
            return Ok(existingProduct);
        }

        product.UserId = userId;
        product.IsDeleted = false;
        product.Commissions = resolvedCommissions;

        context.Products.Add(product);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(CreateProduct), new { id = product.Id }, product);
    }

    [Authorize]
    [HttpPost("delete")]
    public async Task<IActionResult> DeleteProducts([FromBody] DeleteListRequest request)
    {
        if (request?.ListIds == null || request.ListIds.Count == 0)
        {
            return BadRequest("No product IDs provided.");
        }

        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        int updatedCount = await context.Products
            .Where(p => p.UserId == userId && request.ListIds.Contains(p.Id) && !p.IsDeleted)
            .ExecuteUpdateAsync(setters => setters.SetProperty(p => p.IsDeleted, true));

        if (updatedCount == 0)
        {
            return NotFound();
        }

        return Ok();
    }

    [Authorize]
    [HttpPost("fetch")]
    public async Task<IActionResult> GetProducts()
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        List<Product> products = await context.Products
            .Where(p => p.UserId == userId && !p.IsDeleted)
            .Include(p => p.Items)
            .ThenInclude(i => i.Unit)
            .ToListAsync();

        return Ok(products);
    }

    [Authorize]
    [HttpPost("stock")]
    public async Task<IActionResult> GetProductStock()
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        List<ProductStock> products = await context.ProductStocks
            .Where(p => p.Product.UserId == userId && !p.Product.IsDeleted)
            .Include(s => s.Product)
            .ThenInclude(p => p.Items)
            .ThenInclude(i => i.Unit)
            .ToListAsync();

        var result = products
            .Select(p => new
            {
                p.Id,
                p.LowStockAlert,
                p.MaxStockAlert,
                p.Quantity,
                Product = new
                {
                    p.Product!.Id,
                    p.Product.IsDeleted,
                    p.Product.Name,
                    p.Product.Price,
                    p.Product.RetailRate,
                    p.Product.Sku
                }
            })
            .ToList();

        return Ok(result);
    }

    static void DeductMaterials(Product product, decimal quantity, Dictionary<string, UnitStock> dbMaterials)
    {
        foreach (Item item in product.Items)
        {
            if (dbMaterials.TryGetValue(item.Unit.Name, out UnitStock unitStock))
            {
                unitStock.Quantity -= item.Quantity * quantity;
            }
        }
    }

    async Task<Product> GetOrUpdateProductAsync(ProductStock productStock, int userId, Dictionary<string,
        ProductStock> dbProducts, bool saveProducts)
    {
        if (saveProducts && dbProducts.TryGetValue(productStock.Product.GetUniqueKey(), out ProductStock existingStock))
        {
            existingStock.Quantity += productStock.Quantity;
            return existingStock.Product;
        }

        Product dbProduct = await context.Products
            .Include(s => s.Items)
            .ThenInclude(item => item.Unit)
            .SingleOrDefaultAsync(s => s.Id == productStock.Product.Id && s.UserId == userId && !s.IsDeleted);


        if (dbProduct == null || !saveProducts) return dbProduct;
        productStock.Product = dbProduct;
        context.ProductStocks.Add(productStock);

        return dbProduct;
    }

    async Task<IActionResult> ProcessBatchAsync(List<ProductStock> products, bool saveProducts)
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        Dictionary<string, UnitStock> dbMaterials = await context.UnitStocks
            .Where(u => u.UserId == userId)
            .Include(u => u.Unit)
            .ToDictionaryAsync(k => k.Unit.Name);
        Dictionary<string, ProductStock> dbProducts = saveProducts
            ? (await context.ProductStocks
                .Where(p => p.Product.UserId == userId)
                .Include(p => p.Product)
                .ToListAsync())
                .ToDictionary(k => k.Product.GetUniqueKey())
            : new Dictionary<string, ProductStock>();

        foreach (ProductStock productStock in products)
        {
            Product dbProduct = await GetOrUpdateProductAsync(productStock, userId, dbProducts, saveProducts);
            if (dbProduct == null)
            {
                return BadRequest($"Product {productStock.Product.Id} does not exist.");
            }

            DeductMaterials(dbProduct, productStock.Quantity, dbMaterials);
        }

        await context.SaveChangesAsync();

        return Ok();
    }

    async Task<List<Commission>> ResolveCommissions(List<Commission> incoming, int userId)
    {
        Dictionary<int, Commission> existingCommissions =
            await context.Commissions.Where(c => c.UserId == userId).ToDictionaryAsync(c => c.Id);
        Dictionary<(string Name, decimal Rate), Commission> newlyCreatedByKey = new();
        List<Commission> resolved = [];
        if (incoming == null) return resolved;
        foreach (Commission c in incoming)
        {
            if (c.Id > 0 && existingCommissions.TryGetValue(c.Id, out Commission tracked))
            {
                // Reuse tracked entity from DB
                resolved.Add(tracked);
            }
            else
            {
                (string, decimal Rate) key = (c.Name.Trim(), c.Rate);
                if (!newlyCreatedByKey.TryGetValue(key, out var newComm))
                {
                    newComm = new()
                    {
                        Name = key.Item1,
                        Rate = key.Rate,
                        UserId = userId
                    };
                    newlyCreatedByKey[key] = newComm;
                }

                resolved.Add(newComm);
            }
        }

        return resolved;
    }
}