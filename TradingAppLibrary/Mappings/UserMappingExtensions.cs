using System;
using System.Collections.Generic;
using System.Text;
using TradingAppLibrary.Data;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Enums;
using TradingAppLibrary.Models;

namespace TradingAppLibrary.Mappings
{
    public static class UserMappingExtensions
    {
        // 1. User-entitet -> UserManagementDto
        public static UserManagementDto ToDto(this User user)
        {
            if (user == null) return null!;

            return new UserManagementDto(
                user.Id,
                user.Username ?? "",
                user.Email ?? "",
                user.Role ?? UserRole.User.ToString(),
                user.FirstName ?? "",
                user.LastName ?? "",
                user.IsDeleted,
                user.DeletionRequestedAt
            );
        }

        // 2. IEnumerable<User> -> IEnumerable<UserManagementDto>
        public static IEnumerable<UserManagementDto> ToDtoList(this IEnumerable<User> users)
        {
            return users?.Select(u => u.ToDto()) ?? Enumerable.Empty<UserManagementDto>();
        }

        // 3. User-entitet + token -> AuthResponseDto
        public static AuthResponseDto ToAuthResponseDto(this User user, string token)
        {
            if (user == null) return null!;

            return new AuthResponseDto(
                Token: token,
                Username: user.Username ?? "",
                Email: user.Email ?? "",
                Role: user.Role ?? UserRole.User.ToString(),
                FirstName: user.FirstName ?? "",
                LastName: user.LastName ?? ""
            );
        }

        // 4. RegisterDto -> User-entitet (ved registrering)
        public static User ToEntity(this RegisterDto dto)
        {
            if (dto == null) return null!;

            return new User
            {
                FirstName = dto.FirstName?.Trim() ?? "",
                LastName = dto.LastName?.Trim() ?? "",
                Username = dto.Username?.Trim() ?? "",
                Email = dto.Email?.Trim().ToLower() ?? "",
                PasswordHash = PasswordHasher.HashPassword(dto.Password),
                Role = UserRole.User.ToString(),
                CreatedAt = System.DateTime.UtcNow,
                IsDeleted = false
            };
        }

        // 5. UserProfile/UserManagementDto -> opdatering af eksisterende User-entitet
        public static void UpdateFromDto(this User user, UserManagementDto dto)
        {
            if (user == null || dto == null) return;

            user.FirstName = dto.FirstName?.Trim() ?? "";
            user.LastName = dto.LastName?.Trim() ?? "";
            user.Email = dto.Email?.Trim().ToLower() ?? "";
        }
    }
}
