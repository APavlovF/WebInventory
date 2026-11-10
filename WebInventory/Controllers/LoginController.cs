using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using WebInventory.Models;
using WebInventory.Services;

namespace WebInventory.Controllers;

[Route("api/login")]
public class LoginController(IDatabaseReader databaseReader, JwtService jwtService, PasswordService passwordService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        User user = (await databaseReader.Read<User>()).FirstOrDefault(u => u.Email == request.Email);
        if (user == null || !passwordService.Verify(user, request.Password, user.PasswordHash)) return Unauthorized();

        string token = jwtService.Generate(user);

        return Ok(new { token });
    }
}