using System;
using System.Collections.Generic;
using System.Text;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Models;

namespace TradingAppLibrary.Interfaces
{
    public interface IUserService
    {
        Task<User?> GetUserByIdAsync(int id);
        Task<User?> GetUserByEmailAsync(string email);
        Task<User?> GetUserByUsernameAsync(string username);
        Task<IEnumerable<User>> GetAllUsersAsync();
        Task UpdateUserAsync(User user);
        Task DeleteUserAsync(int id);
        Task<UserPreferencesDto?> GetUserPreferencesAsync(string userId);
        Task SaveUserPreferencesAsync(string userId, UserPreferencesDto dto);
        Task<bool> ChangePasswordAsync(int userId, string currentPassword, string newPassword);
        Task<bool> HardDeleteUserAsync(int userId);
    }
}
