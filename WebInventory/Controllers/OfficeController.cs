using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using WebInventory.Data;
using WebInventory.Models;

namespace WebInventory.Controllers;

[ApiController]
[Route("api/office")]
public class OfficeController(EfDbContext context) : ControllerBase
{
    [Authorize]
    [HttpPost("fetch")]
    public async Task<IActionResult> GetCommissions()
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        List<Commission> products = await context.Commissions.Where(p => p.UserId == userId).ToListAsync();

        return Ok(products);
    }
}