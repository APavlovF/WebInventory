using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using WebInventory.Models;

namespace WebInventory.Services;

public class JwtService(IConfiguration configuration)
{
    public string Generate(User user)
    {
        Claim[] claims =
        [
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email)
        ];
        SymmetricSecurityKey key = new(Encoding.UTF8.GetBytes(configuration["Jwt:Key"]!));
        SigningCredentials credentials = new(key, SecurityAlgorithms.HmacSha256);
        JwtSecurityToken token = new(claims: claims, expires: DateTime.UtcNow.AddDays(30), signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}