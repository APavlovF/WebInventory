using Microsoft.AspNetCore.Mvc;
using WebInventory.DataAi;
using WebInventory.Models;

namespace WebInventory.Controllers;

[ApiController]
[Route("api/import")]
public class ImportController(
    GroqParser<MaterialsParserOptions> materialsParser, 
    GroqParser<ProductsParserOptions> productsParser) : InteractiveController
{
    [HttpPost("materials")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB max
    public async Task ImportMaterials(IFormFile file, CancellationToken cancellationToken) =>
        await ImportData<ParserDataOutput<UnitStock>>(materialsParser, file, cancellationToken);

    [HttpPost("products")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB max
    public async Task ImportProducts(IFormFile file, CancellationToken cancellationToken) =>
        await ImportData<ParserDataOutput<Product>>(productsParser, file, cancellationToken);
}