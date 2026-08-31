namespace TradingAppLibrary.Interfaces;

public interface IEmailService
{
    Task SendPasswordResetAsync(string email, string firstName, string resetUrl, CancellationToken cancellationToken = default);
}
