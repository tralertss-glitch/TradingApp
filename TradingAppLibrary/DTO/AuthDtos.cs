namespace TradingAppLibrary.DTO;

// Opretter en ny bruger efter validering af de indsendte oplysninger.
public record RegisterDto(
    string FirstName,
    string LastName,
    string Username,
    string Email,
    string Password
);

// Identifier: e-mail eller brugernavn.
// Email-feltet bevares af hensyn til bagudkompatibilitet med ældre klienter.
public record LoginDto(
    string? Identifier,
    string Password,
    string? Email = null
);

// Behandler auth response dto.
public record AuthResponseDto(
    string Token,
    string Username,
    string Email,
    string Role,
    string FirstName,
    string LastName
);

// Behandler user management dto.
public record UserManagementDto(
    int Id,
    string Username,
    string Email,
    string Role,
    string FirstName,
    string LastName,
    bool IsDeleted,
    DateTime? DeletionRequestedAt
);

// Behandler change password dto.
public record ChangePasswordDto(
    string CurrentPassword,
    string NewPassword
);
