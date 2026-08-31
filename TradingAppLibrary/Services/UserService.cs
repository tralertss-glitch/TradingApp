using Org.BouncyCastle.Crypto.Generators;
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using TradingAppLibrary.Data;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Models;

namespace TradingAppLibrary.Services
{
    public class UserService:IUserService
    {
        private readonly IUserRepository _userRepository;

        public UserService(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        // Henter user by id.
        public async Task<User?> GetUserByIdAsync(int id)
        {
            return await _userRepository.GetByIdAsync(id);
        }

        // Henter user by email.
        public async Task<User?> GetUserByEmailAsync(string email)
        {
            return await _userRepository.GetByEmailAsync(email);
        }

        // Henter user by username.
        public async Task<User?> GetUserByUsernameAsync(string username)
        {
            return await _userRepository.GetByUsernameAsync(username);
        }

        // Henter all users.
        public async Task<IEnumerable<User>> GetAllUsersAsync()
        {
            return await _userRepository.GetAllUsersAsync();
        }

        // Opdaterer user.
        public async Task UpdateUserAsync(User user)
        {
            await _userRepository.UpdateAsync(user);
        }

        // Sletter user.
        public async Task DeleteUserAsync(int id)
        {
            await _userRepository.DeleteAsync(id);
        }

        // Behandler hard delete user.
        public async Task<bool> HardDeleteUserAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                return false;

            // 🛡️ Sikkerhedsbeskyttelse: SuperAdmin-kontoen kan ikke slettes permanent.
            if (user.Role?.ToString().Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase) == true)
            {
                throw new InvalidOperationException("SuperAdmin hesabı kalıcı olarak silinemez.");
            }

            return await _userRepository.HardDeleteUserAsync(userId);
        }
        // Henter user preferences.
        public async Task<UserPreferencesDto?> GetUserPreferencesAsync(string userId)
        {
            var entity = await _userRepository.GetPreferencesByUserIdAsync(userId);
            if (entity == null || string.IsNullOrWhiteSpace(entity.SettingsJson))
            {
                return new UserPreferencesDto(); // Standardindstillinger med tomme/default-værdier.
            }

            try
            {
                return JsonSerializer.Deserialize<UserPreferencesDto>(entity.SettingsJson, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }) ?? new UserPreferencesDto();
            }
            catch
            {
                return new UserPreferencesDto();
            }
        }

        // Gemmer user preferences.
        public async Task SaveUserPreferencesAsync(string userId, UserPreferencesDto dto)
        {
            var json = JsonSerializer.Serialize(dto, new JsonSerializerOptions
            {
                WriteIndented = false
            });

            var preferences = new UserPreferences
            {
                UserId = userId,
                SettingsJson = json,
                UpdatedAt = DateTime.UtcNow
            };

            await _userRepository.SavePreferencesAsync(preferences);
        }

        /// Validerer den nuværende adgangskode med PasswordHasher og gemmer den nye adgangskode som hash, hvis valideringen lykkes.
        public async Task<bool> ChangePasswordAsync(int userId, string currentPassword, string newPassword)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null || user.IsDeleted || string.IsNullOrEmpty(user.PasswordHash))
            {
                return false;
            }

            // Kontroller den nuværende adgangskode med PasswordHasher-klassen.
            bool isCurrentValid = PasswordHasher.VerifyPassword(currentPassword, user.PasswordHash);
            if (!isCurrentValid)
            {
                return false;
            }

            // Hash den nye adgangskode med PBKDF2, og gem den på brugeren.
            user.PasswordHash = PasswordHasher.HashPassword(newPassword);
            await _userRepository.UpdateAsync(user);

            return true;
        }
    }
}
