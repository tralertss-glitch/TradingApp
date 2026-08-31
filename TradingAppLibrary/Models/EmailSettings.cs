namespace TradingAppLibrary.Models;

public class EmailSettings
{
    public bool Enabled { get; set; }
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = "TradingPro";
    public string FrontendBaseUrl { get; set; } = "http://localhost:5173";
    public int ResetTokenExpiryMinutes { get; set; } = 30;
}
