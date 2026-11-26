using System.Net;
using System.Net.Mail;
using WebInventory.Models;

namespace WebInventory.Services;

public class EmailService(IConfiguration config)
{
    public async Task SendEmail(MailMessage mail, string toEmail)
    {
        EmailSettings settings = new EmailSettings(config);
        using SmtpClient client = new SmtpClient(settings.SmtpHost, settings.SmtpPort);
        client.Credentials = new NetworkCredential(settings.FromEmail, settings.Password);
        client.EnableSsl = true;
        mail.From = new MailAddress(settings.FromEmail);
        mail.To.Add(toEmail);

        await client.SendMailAsync(mail);
    }
}