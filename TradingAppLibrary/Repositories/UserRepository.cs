using System;
using System.Collections.Generic;
using System.Text;
using TradingAppLibrary.Data;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Models;
using Microsoft.EntityFrameworkCore;

namespace TradingAppLibrary.Repositories
{
    public class UserRepository: IUserRepository
    {
        private readonly AppDbContext _context;

        public UserRepository(AppDbContext context)
        {
            _context = context;
        }

        // Henter by id.
        public async Task<User?> GetByIdAsync(int id)
        {
            return await _context.Users.FindAsync(id);
        }

        // Henter by email.
        public async Task<User?> GetByEmailAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email)) return null;

            string normalizedEmail = email.Trim().ToLower();

            return await _context.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
        }

        // Henter by username.
        public async Task<User?> GetByUsernameAsync(string username)
        {
            var normalizedUsername = username.Trim().ToLowerInvariant();

            return await _context.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Username.ToLower() == normalizedUsername);
        }


        // Henter by login identifier.
        public async Task<User?> GetByLoginIdentifierAsync(string identifier)
        {
            if (string.IsNullOrWhiteSpace(identifier)) return null;

            var normalized = identifier.Trim().ToLowerInvariant();
            return await _context.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u =>
                    u.Email.ToLower() == normalized ||
                    u.Username.ToLower() == normalized);
        }

        // Henter all users.
        public async Task<IEnumerable<User>> GetAllUsersAsync()
        {
            return await _context.Users.ToListAsync();
        }

        // Tilføjer den relevante operation.
        public async Task AddAsync(User user)
        {
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();
        }

        // Opdaterer den relevante operation.
        public async Task UpdateAsync(User user)
        {
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
        }

        // Sletter den relevante operation.
        public async Task DeleteAsync(int id)
        {
            var user = await GetByIdAsync(id);
            if (user != null)
            {
                user.IsDeleted = true;
                user.DeletionRequestedAt = DateTime.UtcNow;
                _context.Users.Update(user);
                await _context.SaveChangesAsync();
            }
        }

        // Behandler hard delete user.
        public async Task<bool> HardDeleteUserAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return false;

            // Da UserId er en string, sammenligner vi med userId.ToString().
            var stringUserId = userId.ToString();
            var preferences = await _context.UserPreferences
                .FirstOrDefaultAsync(p => p.UserId == stringUserId);

            if (preferences != null)
            {
                _context.UserPreferences.Remove(preferences);
            }

            // Fjern brugeren permanent fra databasen.
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return true;
        }
        // Henter preferences by user id.
        public async Task<UserPreferences?> GetPreferencesByUserIdAsync(string userId)
        {
            return await _context.UserPreferences.FirstOrDefaultAsync(p => p.UserId == userId);
        }

        // Gemmer preferences.
        public async Task SavePreferencesAsync(UserPreferences preferences)
        {
            var existing = await GetPreferencesByUserIdAsync(preferences.UserId);
            if (existing == null)
            {
                await _context.UserPreferences.AddAsync(preferences);
            }
            else
            {
                existing.SettingsJson = preferences.SettingsJson;
                existing.UpdatedAt = DateTime.UtcNow;
                _context.UserPreferences.Update(existing);
            }
            await _context.SaveChangesAsync();
        }
    }
}
