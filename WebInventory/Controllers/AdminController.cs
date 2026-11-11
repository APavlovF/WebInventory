using Microsoft.AspNetCore.Mvc;
using WebInventory.Data;
using WebInventory.Models;

namespace WebInventory.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController(EfDbContext db) : ControllerBase
{
    [HttpPost("invite")]
    public async Task<IActionResult> Invite(string login)
    {
        string adminApiKey = Environment.GetEnvironmentVariable("ADMIN_API_KEY");
        string apiKey = Request.Headers["X-Admin-Key"].FirstOrDefault();
        if (apiKey != adminApiKey) return Unauthorized();

        Invitation invitation = new Invitation
        {
            Login = login,
            Token = Guid.NewGuid(),
            ExpiresUtc = DateTime.UtcNow.AddDays(7)
        };

        db.Invitations.Add(invitation);
        await db.SaveChangesAsync();

        return Ok(invitation.Token);
    }
}