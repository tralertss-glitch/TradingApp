using TradingAppLibrary.DTO;

namespace TradingAppLibrary.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto?> RegisterAsync(RegisterDto registerDto);
    Task<AuthResponseDto?> LoginAsync(LoginDto loginDto);
    Task RequestPasswordResetAsync(ForgotPasswordDto request, CancellationToken cancellationToken = default);
    Task<bool> ResetPasswordAsync(ResetPasswordDto request, CancellationToken cancellationToken = default);
    Task<bool> RequestAccountDeletionAsync(int userId);
    Task<IEnumerable<UserManagementDto>> GetAllUsersAsync();
    Task LogoutAsync();
}
