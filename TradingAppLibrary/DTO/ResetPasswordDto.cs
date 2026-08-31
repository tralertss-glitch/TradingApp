namespace TradingAppLibrary.DTO;

// Validerer reset-tokenet og gemmer brugerens nye password.
public record ResetPasswordDto(
    int UserId,
    string Token,
    string NewPassword
);
