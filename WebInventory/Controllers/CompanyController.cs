using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebInventory.Data;
using WebInventory.Models;

namespace WebInventory.Controllers;

[ApiController]
[Route("api/company")]
public class CompanyController(EfDbContext context) : ControllerBase
{
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateCompany(string name)
    {
        if (string.IsNullOrEmpty(name))
        {
            return BadRequest("Company name is required.");
        }

        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        Company company = new() { Name = name, UserId = userId };

        context.Companies.Add(company);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(CreateCompany), new { id = company.Id }, company);
    }
}