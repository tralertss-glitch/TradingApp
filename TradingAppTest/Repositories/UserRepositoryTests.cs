using Microsoft.EntityFrameworkCore;
using TradingAppLibrary.Models;
using TradingAppLibrary.Repositories;
using TradingAppTest.Helpers;
namespace TradingAppTest.Repositories;

public class UserRepositoryTests
{
    // Kontrollerer den forventede adfærd for dette testscenarie.
    private static User CreateUser(string username = "ozan", string email = "ozan@test.com") => new()
    {
        Username = username,
        Email = email,
        PasswordHash = "hash",
        FirstName = "Ozan",
        LastName = "Korkmaz"
    };

    // Kontrollerer, at loginopslag virker med både brugernavn og e-mail.
    [Fact]
    public async Task GetByLoginIdentifierAsync_FindsByUsernameOrEmailCaseInsensitively()
    {
        await using var db = TestDbContextFactory.Create();
        var repo = new UserRepository(db);
        await repo.AddAsync(CreateUser());

        Assert.NotNull(await repo.GetByLoginIdentifierAsync(" OZAN "));
        Assert.NotNull(await repo.GetByLoginIdentifierAsync(" Ozan@Test.Com "));
    }

    // Kontrollerer, at sletning udføres som soft delete.
    [Fact]
    public async Task DeleteAsync_PerformsSoftDelete()
    {
        await using var db = TestDbContextFactory.Create();
        var repo = new UserRepository(db);
        var user = CreateUser();
        await repo.AddAsync(user);

        await repo.DeleteAsync(user.Id);

        // Kontroller de gemte soft-delete-flags ved at omgå det globale query-filter.
        // Adfærden for det globale filter testes separat i GetAllUsersAsync_ExcludesSoftDeletedUsers.
        var deleted = await db.Users.IgnoreQueryFilters().SingleAsync(u => u.Id == user.Id);
        Assert.True(deleted.IsDeleted);
        Assert.NotNull(deleted.DeletionRequestedAt);
    }

    // Kontrollerer, at brugerindstillinger oprettes eller opdateres uden dubletter.
    [Fact]
    public async Task SavePreferencesAsync_UpsertsPreferences()
    {
        await using var db = TestDbContextFactory.Create();
        var repo = new UserRepository(db);

        await repo.SavePreferencesAsync(new UserPreferences { UserId = "5", SettingsJson = "{\"theme\":\"dark\"}" });
        await repo.SavePreferencesAsync(new UserPreferences { UserId = "5", SettingsJson = "{\"theme\":\"light\"}" });

        var saved = await repo.GetPreferencesByUserIdAsync("5");
        Assert.NotNull(saved);
        Assert.Equal("{\"theme\":\"light\"}", saved!.SettingsJson);
        Assert.Single(db.UserPreferences);
    }

    // Kontrollerer, at sletning udføres som soft delete.
    [Fact]
    public async Task GetAllUsersAsync_ExcludesSoftDeletedUsers()
    {
        await using var db = TestDbContextFactory.Create();
        var repo = new UserRepository(db);
        var active = CreateUser("active", "active@test.com");
        var deleted = CreateUser("deleted", "deleted@test.com");
        await repo.AddAsync(active);
        await repo.AddAsync(deleted);
        await repo.DeleteAsync(deleted.Id);

        var users = (await repo.GetAllUsersAsync()).ToList();

        var user = Assert.Single(users);
        Assert.Equal(active.Id, user.Id);
    }
}
