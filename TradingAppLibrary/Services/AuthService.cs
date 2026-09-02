using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;
using TradingAppLibrary.Data;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Enums;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Models;

namespace TradingAppLibrary.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly ITokenService _tokenService;
    private readonly IEmailService _emailService;
    private readonly EmailSettings _emailSettings;
    private readonly ILogger<AuthService> _logger;

    public AuthService(IUserRepository userRepository, ITokenService tokenService, IEmailService emailService, IOptions<EmailSettings> emailSettings, ILogger<AuthService> logger)
    {
        _userRepository = userRepository;
        _tokenService = tokenService;
        _emailService = emailService;
        _emailSettings = emailSettings.Value;
        _logger = logger;
    }

    // Validerer loginoplysninger og opretter et token for en gyldig bruger.
    public async Task<AuthResponseDto?> LoginAsync(LoginDto request)
    {
        var identifier = string.IsNullOrWhiteSpace(request.Identifier)
            ? request.Email
            : request.Identifier;

        if (string.IsNullOrWhiteSpace(identifier) || string.IsNullOrWhiteSpace(request.Password))
            return null;

        var user = await _userRepository.GetByLoginIdentifierAsync(identifier);

        if (user == null || !PasswordHasher.VerifyPassword(request.Password, user.PasswordHash))
            return null;

        if (user.IsDeleted)
        {
            if (user.DeletionRequestedAt.HasValue)
            {
                var daysPassed = (DateTime.UtcNow - user.DeletionRequestedAt.Value).TotalDays;
                if (daysPassed > 30)
                    throw new InvalidOperationException("Bu hesap silinme süresini (30 gün) doldurduğu için kapatılmıştır.");
            }

            user.IsDeleted = false;
            user.DeletionRequestedAt = null;
            await _userRepository.UpdateAsync(user);
        }

        var userRole = user.Role ?? UserRole.User.ToString();
        var token = _tokenService.GenerateToken(user.Id, user.Username, userRole);
        return new AuthResponseDto(token, user.Username, user.Email, userRole, user.FirstName, user.LastName);
    }

    // Opretter en ny bruger efter validering af de indsendte oplysninger.
    public async Task<AuthResponseDto?> RegisterAsync(RegisterDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
            throw new InvalidOperationException("Şifre en az 8 karakter olmalıdır.");

        var existingUserByEmail = await _userRepository.GetByEmailAsync(request.Email);
        if (existingUserByEmail != null)
            throw new InvalidOperationException("Bu e-posta adresi zaten kullanılmaktadır.");

        var existingUserByUsername = await _userRepository.GetByUsernameAsync(request.Username);
        if (existingUserByUsername != null)
            throw new InvalidOperationException("Bu kullanıcı adı zaten kullanılmaktadır.");

        var defaultRole = UserRole.User.ToString();
        var newUser = new User
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Username = request.Username.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            PasswordHash = PasswordHasher.HashPassword(request.Password),
            Role = defaultRole,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow
        };

        await _userRepository.AddAsync(newUser);
        var token = _tokenService.GenerateToken(newUser.Id, newUser.Username, newUser.Role);
        return new AuthResponseDto(token, newUser.Username, newUser.Email, newUser.Role, newUser.FirstName, newUser.LastName);
    }

    // Opretter et password-reset token og sender reset-linket til brugeren.
    public async Task RequestPasswordResetAsync(ForgotPasswordDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Identifier))
            return;

        var user = await _userRepository.GetByLoginIdentifierAsync(request.Identifier);
        if (user == null || user.IsDeleted)
            return;

        var tokenBytes = RandomNumberGenerator.GetBytes(32);
        var token = Base64UrlEncode(tokenBytes);
        user.PasswordResetTokenHash = HashResetToken(token);
        user.PasswordResetTokenExpiresAtUtc = DateTime.UtcNow.AddMinutes(Math.Max(5, _emailSettings.ResetTokenExpiryMinutes));
        await _userRepository.UpdateAsync(user);

        var baseUrl = _emailSettings.FrontendBaseUrl.TrimEnd('/');
        var resetUrl = $"{baseUrl}/?resetToken={Uri.EscapeDataString(token)}&userId={user.Id}";

        try
        {
            await _emailService.SendPasswordResetAsync(user.Email, user.FirstName, resetUrl, cancellationToken);
        }
        catch (Exception ex)
        {
            // Vi sender ikke en fejl til controlleren, så vi undgår account enumeration.
            _logger.LogError(ex, "Password reset email could not be sent for UserId={UserId}", user.Id);
        }
    }

    // Validerer reset-tokenet og gemmer brugerens nye password.
    public async Task<bool> ResetPasswordAsync(ResetPasswordDto request, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(request.Token) ||
            string.IsNullOrWhiteSpace(request.NewPassword) ||
            request.NewPassword.Length < 8)
            return false;

        var user = await _userRepository.GetByIdAsync(request.UserId);
        if (user == null || user.IsDeleted)
            return false;

        var storedResetTokenHash = user.PasswordResetTokenHash;
        var resetTokenExpiresAtUtc = user.PasswordResetTokenExpiresAtUtc;

        if (string.IsNullOrWhiteSpace(storedResetTokenHash) ||
            !resetTokenExpiresAtUtc.HasValue ||
            resetTokenExpiresAtUtc.Value < DateTime.UtcNow)
            return false;

        var incomingHash = HashResetToken(request.Token);
        if (!FixedTimeEquals(storedResetTokenHash, incomingHash))
            return false;

        user.PasswordHash = PasswordHasher.HashPassword(request.NewPassword);
        user.PasswordResetTokenHash = null;
        user.PasswordResetTokenExpiresAtUtc = null;
        await _userRepository.UpdateAsync(user);
        return true;
    }

    // Behandler account deletion.
    public async Task<bool> RequestAccountDeletionAsync(int userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null || user.IsDeleted) return false;

        user.IsDeleted = true;
        user.DeletionRequestedAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(user);
        return true;
    }

    // Henter all users.
    public async Task<IEnumerable<UserManagementDto>> GetAllUsersAsync()
    {
        var users = await _userRepository.GetAllUsersAsync();
        return users.Select(u => new UserManagementDto(
            u.Id, u.Username, u.Email, u.Role ?? UserRole.User.ToString(),
            u.FirstName, u.LastName, u.IsDeleted, u.DeletionRequestedAt));
    }

    // Logger brugeren ud den relevante operation.
    public Task LogoutAsync() => Task.CompletedTask;

    // Hasher reset token.
    private static string HashResetToken(string token)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(hash);
    }

    // Behandler fixed time equals.
    private static bool FixedTimeEquals(string storedHex, string incomingHex)
    {
        try
        {
            return CryptographicOperations.FixedTimeEquals(
                Convert.FromHexString(storedHex),
                Convert.FromHexString(incomingHex));
        }
        catch
        {
            return false;
        }
    }

    // Behandler base 64 url encode.
    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
