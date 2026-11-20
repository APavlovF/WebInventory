using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using WebInventory.Data;
using WebInventory.Models;

namespace WebInventory.Controllers;

[Authorize]
[Route("api/logo")]
public class LogoController(EfDbContext context) : ControllerBase
{
    const long MaxFileSize = 1 * 1024 * 1024; // 1 MB
    readonly HttpClient _httpClient = new();

    [HttpGet("get")]
    public async Task<IActionResult> GetLogo()
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        string logoUrl = (await context.Users.SingleOrDefaultAsync(u => u.Id == userId))?.LogoUrl;

        return Ok(new { logoUrl });
    }


    [HttpPost("upload")]
    [RequestSizeLimit(MaxFileSize)]
    public async Task<IActionResult> UploadLogo(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("No file uploaded.");

        if (file.Length > MaxFileSize) return BadRequest("File size exceeds 1 MB.");

        if (!string.Equals(file.ContentType, "image/png", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Only PNG images are allowed.");

        // Verify PNG magic bytes (89 50 4E 47)
        await using Stream stream = file.OpenReadStream();
        byte[] header = new byte[4];
        if (await stream.ReadAsync(header, 0, 4) < 4 ||
            header[0] != 0x89 || header[1] != 0x50 || header[2] != 0x4E || header[3] != 0x47)
        {
            return BadRequest("Invalid PNG file.");
        }
        stream.Position = 0;

        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        // Upload to Supabase Storage bucket "logos"
        string supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL");
        string supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY");
        string objectPath = $"{userId}/logo.png";

        HttpRequestMessage request =
            new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/logo/{objectPath}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", supabaseKey);
        request.Headers.Add("x-upsert", "true"); // Overwrites existing logo for this user

        StreamContent content = new StreamContent(stream);
        content.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        request.Content = content;
        HttpResponseMessage response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return StatusCode(500, "Failed to store logo in cloud storage.");

        // Public URL format for a public Supabase bucket named "logo"
        string publicUrl = $"{supabaseUrl}/logo/{objectPath}";

        // Save URL in PostgreSQL for current user
        User user = await context.Users.SingleOrDefaultAsync(u => u.Id == userId);
        user.LogoUrl = publicUrl;
        await context.SaveChangesAsync();

        return Ok(new { logoUrl = publicUrl });
    }
}