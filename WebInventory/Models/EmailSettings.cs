namespace WebInventory.Models;

public class EmailSettings(IConfiguration config)
{
    public string SmtpHost { get; set; } = config["SMTP_HOST"];
    public int SmtpPort { get; set; } = int.TryParse(config["SMTP_PORT"], out int port) ? port : 587;
    public string FromEmail { get; set; } = config["SMTP_USER"];
    public string Password { get; set; } = config["SMTP_PASS"];
    public string ToEmail { get; set; }
}