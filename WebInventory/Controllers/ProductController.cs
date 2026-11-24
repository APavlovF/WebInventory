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
    [HttpPost("save")]
    public async Task<IActionResult> CreateProduct([FromBody] List<Product> products)
    {
        if (products == null || products.Count == 0)
        {
            return BadRequest("Product data is required.");
        }

        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        // 1. Validate and load all referenced Units in a single query
        HashSet<int> unitIds = products
            .SelectMany(p => p.Items ?? Enumerable.Empty<Item>())
            .Select(i => i.Unit.Id)
            .ToHashSet();

        Dictionary<int, Unit> unitsById = await context.Units
            .Where(u => unitIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        foreach (Product product in products)
        {
            foreach (Item item in product.Items)
            {
                if (!unitsById.TryGetValue(item.Unit.Id, out Unit existingUnit))
                {
                    return BadRequest($"Unit {item.Unit.Id} does not exist.");
                }

                item.Unit = existingUnit;
            }
        }

        // 2. Load all existing products for this user to check edits, duplicates, and soft-deletes
        List<Product> userProducts = await context.Products
            .Include(p => p.Items)
            .Include(p => p.Commissions)
            .Where(p => p.UserId == userId)
            .ToListAsync();

        Dictionary<int, Product> existingById = userProducts.ToDictionary(p => p.Id);
        Dictionary<string, Product> existingByKey = userProducts
            .ToDictionary(p => p.GetUniqueKey());
        HashSet<string> batchKeys = [];
        List<Product> savedProducts = new List<Product>(products.Count);
        foreach (Product product in products)
        {
            product.TrimKeyProperties();
            string normalizedKey = product.GetUniqueKey();
            if (!batchKeys.Add(normalizedKey))
            {
                return BadRequest($"Duplicate product '{normalizedKey}' in request.");
            }

            List<Commission> resolvedCommissions = await ResolveCommissions(product.Commissions, userId);
            // Case A: Updating an existing product (Id > 0)
            if (product.Id > 0)
            {
                if (!existingById.TryGetValue(product.Id, out Product targetProduct) || targetProduct.IsDeleted)
                {
                    return NotFound($"Product with Id {product.Id} does not exist.");
                }

                // Ensure the new Name/SKU doesn't collide with a different active product
                if (existingByKey.TryGetValue(normalizedKey, out Product keyOwner)
                    && keyOwner.Id != targetProduct.Id
                    && !keyOwner.IsDeleted)
                {
                    return Conflict($"Product '{normalizedKey}' already exists.");
                }

                // Update key lookup map in case this product's key changed
                existingByKey.Remove(targetProduct.GetUniqueKey());

                targetProduct.Name = product.Name;
                targetProduct.Sku = product.Sku;
                targetProduct.Markup = product.Markup;
                targetProduct.WorkCost = product.WorkCost;
                targetProduct.Price = product.Price;
                targetProduct.RetailRate = product.RetailRate;

                targetProduct.Items.Clear();
                foreach (Item item in product.Items)
                {
                    targetProduct.Items.Add(item);
                }

                targetProduct.Commissions.Clear();
                foreach (Commission commission in resolvedCommissions)
                {
                    targetProduct.Commissions.Add(commission);
                }

                existingByKey[normalizedKey] = targetProduct;
                savedProducts.Add(targetProduct);
                continue;
            }

            // Case B: Creating a new product (Id == 0) — check for active conflict or soft-deleted match
            if (existingByKey.TryGetValue(normalizedKey, out Product existingProduct))
            {
                if (!existingProduct.IsDeleted)
                {
                    return Conflict($"Product '{normalizedKey}' already exists.");
                }

                // Restore and update the soft-deleted product
                existingProduct.IsDeleted = false;
                existingProduct.Name = product.Name;
                existingProduct.Sku = product.Sku;
                existingProduct.Markup = product.Markup;
                existingProduct.WorkCost = product.WorkCost;
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

                savedProducts.Add(existingProduct);
                continue;
            }

            // Case C: Brand-new product
            product.UserId = userId;
            product.IsDeleted = false;
            product.Commissions = resolvedCommissions;

            context.Products.Add(product);
            existingByKey[normalizedKey] = product;
            savedProducts.Add(product);
        }

        await context.SaveChangesAsync();

        return Ok(savedProducts);
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