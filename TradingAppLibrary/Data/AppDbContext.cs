using Microsoft.EntityFrameworkCore;
using TradingAppLibrary.Models;

namespace TradingAppLibrary.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Exchange> Exchanges => Set<Exchange>();
    public DbSet<Symbol> Symbols => Set<Symbol>();
    public DbSet<Candle> Candles => Set<Candle>();
    public DbSet<Watchlist> Watchlists => Set<Watchlist>();
    public DbSet<WatchlistItem> WatchlistItems => Set<WatchlistItem>();
    public DbSet<UserPreferences> UserPreferences => Set<UserPreferences>();
    public DbSet<Alert> Alerts => Set<Alert>();
    public DbSet<ChartDrawing> ChartDrawings => Set<ChartDrawing>();

    // Behandler model creating.
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasIndex(u => u.Username).IsUnique();
            entity.Property(u => u.Username).IsRequired().HasMaxLength(50);
            entity.Property(u => u.Email).IsRequired().HasMaxLength(100);
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.Role).HasMaxLength(20);
            entity.Property(u => u.FirstName).HasMaxLength(50);
            entity.Property(u => u.LastName).HasMaxLength(50);
            entity.Property(u => u.IsDeleted).HasDefaultValue(false);
            entity.Property(u => u.DeletionRequestedAt).IsRequired(false);
            entity.Property(u => u.PasswordResetTokenHash).HasMaxLength(64).IsRequired(false);
            entity.Property(u => u.PasswordResetTokenExpiresAtUtc).IsRequired(false);
            entity.HasQueryFilter(u => !u.IsDeleted);
        });

        modelBuilder.Entity<UserPreferences>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => p.UserId).IsUnique();
            entity.Property(p => p.UserId).IsRequired();
            entity.Property(p => p.SettingsJson).IsRequired();
            entity.Property(p => p.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<Exchange>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.HasIndex(e => e.Code).IsUnique();

            entity.HasData(new Exchange
            {
                Id = 1,
                Code = "BINANCE",
                Name = "Binance",
                IsActive = true
            });
        });

        modelBuilder.Entity<Symbol>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Name).IsRequired().HasMaxLength(30);
            entity.Property(s => s.BaseAsset).IsRequired().HasMaxLength(20);
            entity.Property(s => s.QuoteAsset).IsRequired().HasMaxLength(20);
            entity.Property(s => s.IsActive).HasDefaultValue(false);

            entity.HasOne(s => s.Exchange)
                .WithMany(e => e.Symbols)
                .HasForeignKey(s => s.ExchangeId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(s => new { s.ExchangeId, s.Name }).IsUnique();
            entity.HasIndex(s => new { s.ExchangeId, s.IsActive });
        });

        modelBuilder.Entity<Candle>(entity =>
        {
            entity.HasKey(c => new { c.Id, c.OpenTime });
            entity.Property(c => c.Id).ValueGeneratedOnAdd();
            entity.Property(c => c.Interval).IsRequired().HasMaxLength(10);

            entity.HasOne(c => c.Symbol)
                .WithMany(s => s.Candles)
                .HasForeignKey(c => c.SymbolId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(c => new { c.SymbolId, c.Interval, c.OpenTime }).IsUnique();
        });

        modelBuilder.Entity<Alert>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.UserId).IsRequired();
            entity.Property(a => a.TargetPrice).HasColumnType("decimal(18,8)");
            entity.Property(a => a.Condition).IsRequired().HasMaxLength(20);
            entity.Property(a => a.Note).HasMaxLength(255);
            entity.Property(a => a.IsTriggered).HasDefaultValue(false);
            entity.Property(a => a.IsActive).HasDefaultValue(true);
            entity.Property(a => a.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(a => a.Symbol)
                .WithMany()
                .HasForeignKey(a => a.SymbolId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(a => new { a.SymbolId, a.IsActive, a.IsTriggered });
            entity.HasIndex(a => a.UserId);
        });

        modelBuilder.Entity<Watchlist>(entity =>
        {
            entity.HasKey(w => w.Id);
            entity.Property(w => w.Name).IsRequired().HasMaxLength(50);
            entity.HasOne(w => w.User)
                .WithMany(u => u.Watchlists)
                .HasForeignKey(w => w.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(w => !w.User.IsDeleted);
        });

        modelBuilder.Entity<WatchlistItem>(entity =>
        {
            entity.HasKey(wi => wi.Id);
            entity.HasOne(wi => wi.Watchlist)
                .WithMany(w => w.Items)
                .HasForeignKey(wi => wi.WatchlistId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(wi => wi.Symbol)
                .WithMany()
                .HasForeignKey(wi => wi.SymbolId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(wi => new { wi.WatchlistId, wi.SymbolId }).IsUnique();
            entity.HasQueryFilter(wi => !wi.Watchlist.User.IsDeleted);
        });

        modelBuilder.Entity<ChartDrawing>(entity =>
        {
            entity.HasKey(d => d.Id);
            entity.Property(d => d.Interval).IsRequired().HasMaxLength(10);
            entity.Property(d => d.DrawingType).IsRequired().HasMaxLength(30);
            entity.Property(d => d.DataJson).IsRequired().HasColumnType("jsonb");
            entity.Property(d => d.IsVisible).HasDefaultValue(true);
            entity.Property(d => d.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(d => d.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.User)
                .WithMany(u => u.ChartDrawings)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Symbol)
                .WithMany(s => s.ChartDrawings)
                .HasForeignKey(d => d.SymbolId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(d => new { d.UserId, d.SymbolId, d.Interval });
            entity.HasQueryFilter(d => !d.User.IsDeleted);
        });
    }
}
