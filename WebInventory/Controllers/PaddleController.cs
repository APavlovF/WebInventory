using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebInventory.Data;
using WebInventory.Models;
using WebInventory.Services;

namespace WebInventory.Controllers;

[ApiController]
[Route("api/paddle")]
public class PaddleController(EfDbContext db, EmailService emailService, IConfiguration config) : ControllerBase
{
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook()
    {
        try
        {
            using StreamReader reader = new StreamReader(Request.Body);
            string rawBody = await reader.ReadToEndAsync();
            // 1. Verify the request genuinely came from Paddle
            string webhookSecret = config["PADDLE_WEBHOOK_SECRET"] ?? "";
            string signatureHeader = Request.Headers["Paddle-Signature"].FirstOrDefault();
            if (!VerifyPaddleSignature(rawBody, signatureHeader, webhookSecret))
            {
                await SendAdminAlertAsync("Invalid Paddle signature.", $"Payload:\n{rawBody}");

                return Unauthorized("Invalid Paddle signature.");
            }

            using JsonDocument doc = JsonDocument.Parse(rawBody);
            string eventType = doc.RootElement.GetProperty("event_type").GetString();
            JsonElement data = doc.RootElement.GetProperty("data");

            switch (eventType)
            {
                // Triggered immediately when the 14-day free trial starts
                case "subscription.created":
                    {
                        string subscriptionId = data.GetProperty("id").GetString()!;
                        string status = data.GetProperty("status").GetString();
                        string email = null;
                        if (data.TryGetProperty("custom_data", out JsonElement customData) &&
                            customData.ValueKind == JsonValueKind.Object &&
                            customData.TryGetProperty("login", out JsonElement loginProp))
                        {
                            email = loginProp.GetString();
                        }

                        if (!string.IsNullOrWhiteSpace(email) && (status == "trialing" || status == "active"))
                        {
                            string normalizedEmail = email.Trim().ToLowerInvariant();

                            // 1. Find existing invitation or create a new one
                            Invitation invitation =
                                await db.Invitations.FirstOrDefaultAsync(i => i.SubscriptionId == subscriptionId);

                            if (invitation == null)
                            {
                                invitation = new Invitation
                                {
                                    Login = normalizedEmail,
                                    Token = Guid.NewGuid(),
                                    ExpiresUtc = DateTime.UtcNow.AddDays(7),
                                    SubscriptionId = subscriptionId,
                                    EmailSent = false
                                };

                                db.Invitations.Add(invitation);
                                await db.SaveChangesAsync(); // Saved first so token is persisted even if email fails
                            }

                            // 2. Only send email if it hasn't been sent yet (safe across Paddle retries!)
                            if (!invitation.EmailSent)
                            {
                                await SendActivationEmailAsync(normalizedEmail, invitation.Token); // Throws 500 on failure -> Paddle retries!

                                invitation.EmailSent = true;
                                await db.SaveChangesAsync();
                            }
                        }
                        break;
                    }

                // Triggered when trial ends without payment, user cancels, or payment fails
                case "subscription.canceled":
                case "subscription.paused":
                    {
                        string subscriptionId = data.GetProperty("id").GetString()!;
                        User user = await db.Users.FirstOrDefaultAsync(u => u.SubscriptionId == subscriptionId);
                        if (user != null)
                        {
                            user.SubscriptionStatus = SubscriptionStatus.CANCELLED; // Your /api/login should reject users where IsActive == false
                            await db.SaveChangesAsync();
                        }

                        break;
                    }
            }

            return Ok();
        }
        catch (Exception e)
        {
            await SendAdminAlertAsync("Paddle Webhook Failed", $"{e.Message}");

            return StatusCode(500, "Webhook processing failed.");
        }
    }

    private async Task SendActivationEmailAsync(string toEmail, Guid token)
    {
        string frontendUrl = (config["FRONTEND_URL"] ?? "http://localhost:5050/WebInventory").TrimEnd('/');
        string activationLink = $"{frontendUrl}/?inviteToken={token}";
        MailMessage mail = new MailMessage
        {
            Subject = "Activate your 14-Day Free Trial",
            Body = $"""
                    Welcome! Your 14-day free trial is active.

                    Click the link below to create your password and access your account:
                    {activationLink}

                    Or paste this activation token manually on the First Access screen:
                    {token}

                    If you have any questions, reply to this email.
                    """,
            IsBodyHtml = false
        };

        await emailService.SendEmail(mail, toEmail);
    }

    private async Task SendAdminAlertAsync(string subject, string body)
    {
        MailMessage mail = new MailMessage
        {
            Subject = subject,
            Body = body,
            IsBodyHtml = false
        };

        await emailService.SendEmail(mail, config["SMTP_USER"]);
    }


    private static bool VerifyPaddleSignature(string rawBody, string header, string secret)
    {
        if (string.IsNullOrWhiteSpace(header) || string.IsNullOrWhiteSpace(secret)) return false;

        string ts = null;
        string h1 = null;
        foreach (string part in header.Split(';'))
        {
            string[] kv = part.Split('=', 2);
            if (kv.Length == 2)
            {
                switch (kv[0])
                {
                    case "ts":
                        ts = kv[1];
                        break;
                    case "h1":
                        h1 = kv[1];
                        break;
                }
            }
        }

        if (ts == null || h1 == null) return false;

        string signedPayload = $"{ts}:{rawBody}";
        using HMACSHA256 hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        byte[] hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(signedPayload));
        string computedHash = Convert.ToHexString(hashBytes).ToLowerInvariant();

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(computedHash),
            Encoding.UTF8.GetBytes(h1.ToLowerInvariant())
        );
    }
}