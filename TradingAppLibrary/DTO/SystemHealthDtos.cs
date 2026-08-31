namespace TradingAppLibrary.DTO;

public sealed class SystemHealthDto
{
    public string Status { get; init; } = "Unknown";
    public bool DatabaseHealthy { get; init; }
    public bool TimescaleHealthy { get; init; }
    public bool CandlesHypertableHealthy { get; init; }
    public int ActiveExchangeCount { get; init; }
    public int ActiveSymbolCount { get; init; }
    public DateTime? LastCandleTimeUtc { get; init; }
    public double? LastCandleAgeSeconds { get; init; }
    public long ValidationErrorCount { get; init; }
    public long ValidationWarningCount { get; init; }
    public DateTime StartedAtUtc { get; init; }
    public TimeSpan Uptime { get; init; }
    public DateTime CheckedAtUtc { get; init; }
    public IReadOnlyList<ExchangeHealthDto> Exchanges { get; init; } = Array.Empty<ExchangeHealthDto>();
}

public sealed class ExchangeHealthDto
{
    public string ExchangeCode { get; init; } = string.Empty;
    public string ExchangeName { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public int ActiveSymbolCount { get; init; }
    public DateTime? LastCandleTimeUtc { get; init; }
    public double? LastCandleAgeSeconds { get; init; }
    public bool HistoricalSyncRunning { get; init; }
    public DateTime? HistoricalSyncStartedAtUtc { get; init; }
    public DateTime? HistoricalSyncCompletedAtUtc { get; init; }
    public bool RealtimeConnected { get; init; }
    public DateTime? RealtimeConnectedAtUtc { get; init; }
    public DateTime? LastRealtimeMessageAtUtc { get; init; }
    public string? LastError { get; init; }
    public DateTime? LastErrorAtUtc { get; init; }
    public long ValidationErrorCount { get; init; }
    public long ValidationWarningCount { get; init; }
    public string Status { get; init; } = "Unknown";
}
