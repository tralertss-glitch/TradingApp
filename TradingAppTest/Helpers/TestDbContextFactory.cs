using Microsoft.EntityFrameworkCore;
using TradingAppLibrary.Data;

namespace TradingAppTest.Helpers;

internal static class TestDbContextFactory
{
    // Opretter den relevante operation.
    public static AppDbContext Create(string? databaseName = null)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName ?? $"TradingAppTest_{Guid.NewGuid():N}")
            .EnableSensitiveDataLogging()
            .Options;

        var context = new AppDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }
}
