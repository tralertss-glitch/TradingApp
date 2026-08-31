using TradingAppLibrary.Models;

namespace TradingAppLibrary.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(int id);
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByUsernameAsync(string username);
    Task<User?> GetByLoginIdentifierAsync(string identifier);
    Task<IEnumerable<User>> GetAllUsersAsync();
    Task AddAsync(User user);
    Task UpdateAsync(User user);
    Task DeleteAsync(int id);
    Task<UserPreferences?> GetPreferencesByUserIdAsync(string userId);
    Task SavePreferencesAsync(UserPreferences preferences);
    Task<bool> HardDeleteUserAsync(int userId);
}
