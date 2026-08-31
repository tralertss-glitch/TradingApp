using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Models;

namespace TradingAppLibrary.Services;

public class SmtpEmailService : IEmailService
{
    private readonly EmailSettings _settings;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IOptions<EmailSettings> options, ILogger<SmtpEmailService> logger)
    {
        _settings = options.Value;
        _logger = logger;
    }

    // Sender password reset.
    public async Task SendPasswordResetAsync(string email, string firstName, string resetUrl, CancellationToken cancellationToken = default)
    {
        if (!_settings.Enabled)
        {
            // Udviklingshjælp: Hvis SMTP er deaktiveret, vises linket kun i backend-loggen.
            _logger.LogWarning("SMTP disabled. Password reset link for {Email}: {ResetUrl}", email, resetUrl);
            return;
        }

        using var message = new MailMessage
        {
            From = new MailAddress(_settings.FromEmail, _settings.FromName),
            Subject = "TradingPro - Şifre Sıfırlama",
            Body = $"Merhaba {firstName},\n\nŞifrenizi sıfırlamak için aşağıdaki bağlantıyı kullanın. Bu bağlantı kısa süre sonra geçersiz olacaktır.\n\n{resetUrl}\n\nBu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.",
            IsBodyHtml = false
        };
        message.To.Add(email);

        using var client = new SmtpClient(_settings.Host, _settings.Port)
        {
            EnableSsl = _settings.EnableSsl,
            Credentials = new NetworkCredential(_settings.Username, _settings.Password)
        };

        cancellationToken.ThrowIfCancellationRequested();
        await client.SendMailAsync(message, cancellationToken);
    }
}
