using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebInventory.Data;
using WebInventory.Models;
using WebInventory.Services;

namespace WebInventory.Controllers;

[Route("api/activate")]
public class ActivateUser(EfDbContext db, PasswordService passwordService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Activate([FromBody] ActivateRequest request)
    {
        Invitation invitation = await db.Invitations.SingleOrDefaultAsync(i => i.Token == request.Token);
        if (invitation == null || invitation.Used || invitation.ExpiresUtc < DateTime.UtcNow) return BadRequest();

        User user = new User
        {
            Email = invitation.Login,
            PasswordHash = passwordService.HashPassword(null, request.Password),
            IsActivated = true
        };

        db.Users.Add(user);
        invitation.Used = true;

        await db.SaveChangesAsync();

        return Ok();
    }
}