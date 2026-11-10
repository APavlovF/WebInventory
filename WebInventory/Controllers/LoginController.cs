using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using WebInventory.Models;
using WebInventory.Services;

namespace WebInventory.Controllers;

public class LoginController(IDatabaseReader databaseReader, JwtService jwtService, PasswordService passwordService) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        User user = (await databaseReader.Read<User>()).FirstOrDefault(u => u.Email == request.Email);
        if (user == null || !passwordService.Verify(user, request.Password, user.PasswordHash)) return Unauthorized();

        string token = jwtService.Generate(user);

        return Ok(new { token });
    }
}