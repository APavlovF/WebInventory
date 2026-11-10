using Microsoft.AspNetCore.Identity;
using WebInventory.Models;

namespace WebInventory.Services;

public class PasswordService
{
    private readonly PasswordHasher<User> _hasher = new();

    public string HashPassword(User user, string password) => _hasher.HashPassword(user, password);

    public bool Verify(User user, string password, string hash)
    {
        PasswordVerificationResult result = _hasher.VerifyHashedPassword(user, hash, password);

        return result == PasswordVerificationResult.Success;
    }
}