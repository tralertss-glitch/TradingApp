using System.Collections.Concurrent;
using TradingAppLibrary.Interfaces;

namespace TradingAppLibrary.Runtime;

public sealed class MarketDataRuntimeState : IMarketDataRuntimeState
{
    private readonly ConcurrentDictionary<string, MutableExchangeRuntimeState> _states =
        new(StringComparer.OrdinalIgnoreCase);

    public DateTime StartedAtUtc { get; } = DateTime.UtcNow;

    // Indstiller historical sync running.
    public void SetHistoricalSyncRunning(string exchangeCode, bool running)
    {
        var state = GetOrCreate(exchangeCode);
        lock (state.SyncRoot)
        {
            if (running)
            {
                state.HistoricalSyncActivityCount++;
                if (state.HistoricalSyncActivityCount == 1)
                {
                    state.HistoricalSyncStartedAtUtc = DateTime.UtcNow;
                    state.HistoricalSyncCompletedAtUtc = null;
                }
            }
            else
            {
                state.HistoricalSyncActivityCount = Math.Max(0, state.HistoricalSyncActivityCount - 1);
                if (state.HistoricalSyncActivityCount == 0)
                    state.HistoricalSyncCompletedAtUtc = DateTime.UtcNow;
            }
        }
    }

    // Indstiller realtime connected.
    public void SetRealtimeConnected(string exchangeCode, bool connected)
    {
        var state = GetOrCreate(exchangeCode);
        lock (state.SyncRoot)
        {
            state.RealtimeConnected = connected;
            if (connected)
                state.RealtimeConnectedAtUtc = DateTime.UtcNow;
        }
    }

    // Behandler touch realtime message.
    public void TouchRealtimeMessage(string exchangeCode)
    {
        var state = GetOrCreate(exchangeCode);
        lock (state.SyncRoot)
        {
            state.RealtimeConnected = true;
            state.RealtimeConnectedAtUtc ??= DateTime.UtcNow;
            state.LastRealtimeMessageAtUtc = DateTime.UtcNow;
        }
    }

    // Registrerer validation error.
    public void RecordValidationError(string exchangeCode, long count = 1)
    {
        if (count <= 0)
            return;

        var state = GetOrCreate(exchangeCode);
        Interlocked.Add(ref state.ValidationErrorCount, count);
    }

    // Registrerer validation warning.
    public void RecordValidationWarning(string exchangeCode, long count = 1)
    {
        if (count <= 0)
            return;

        var state = GetOrCreate(exchangeCode);
        Interlocked.Add(ref state.ValidationWarningCount, count);
    }

    // Registrerer error.
    public void RecordError(string exchangeCode, string error)
    {
        var state = GetOrCreate(exchangeCode);
        lock (state.SyncRoot)
        {
            state.LastError = error;
            state.LastErrorAtUtc = DateTime.UtcNow;
        }
    }

    // Nulstiller error.
    public void ClearError(string exchangeCode)
    {
        var state = GetOrCreate(exchangeCode);
        lock (state.SyncRoot)
        {
            state.LastError = null;
            state.LastErrorAtUtc = null;
        }
    }

    // Henter snapshot.
    public MarketDataRuntimeSnapshot GetSnapshot()
    {
        var exchangeStates = _states
            .OrderBy(x => x.Key, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                x => x.Key,
                x => ToSnapshot(x.Key, x.Value),
                StringComparer.OrdinalIgnoreCase);

        return new MarketDataRuntimeSnapshot(
            StartedAtUtc,
            exchangeStates);
    }

    // Henter or create.
    private MutableExchangeRuntimeState GetOrCreate(string exchangeCode)
    {
        var normalized = exchangeCode.Trim().ToUpperInvariant();
        return _states.GetOrAdd(normalized, _ => new MutableExchangeRuntimeState());
    }

    // Behandler to snapshot.
    private static ExchangeRuntimeSnapshot ToSnapshot(
        string exchangeCode,
        MutableExchangeRuntimeState state)
    {
        lock (state.SyncRoot)
        {
            return new ExchangeRuntimeSnapshot(
                exchangeCode,
                state.HistoricalSyncActivityCount > 0,
                state.HistoricalSyncStartedAtUtc,
                state.HistoricalSyncCompletedAtUtc,
                state.RealtimeConnected,
                state.RealtimeConnectedAtUtc,
                state.LastRealtimeMessageAtUtc,
                state.LastError,
                state.LastErrorAtUtc,
                Interlocked.Read(ref state.ValidationErrorCount),
                Interlocked.Read(ref state.ValidationWarningCount));
        }
    }

    private sealed class MutableExchangeRuntimeState
    {
        public object SyncRoot { get; } = new();
        public int HistoricalSyncActivityCount { get; set; }
        public DateTime? HistoricalSyncStartedAtUtc { get; set; }
        public DateTime? HistoricalSyncCompletedAtUtc { get; set; }
        public bool RealtimeConnected { get; set; }
        public DateTime? RealtimeConnectedAtUtc { get; set; }
        public DateTime? LastRealtimeMessageAtUtc { get; set; }
        public string? LastError { get; set; }
        public DateTime? LastErrorAtUtc { get; set; }
        public long ValidationErrorCount;
        public long ValidationWarningCount;
    }
}

// Behandler market data runtime snapshot.
public sealed record MarketDataRuntimeSnapshot(
    DateTime StartedAtUtc,
    IReadOnlyDictionary<string, ExchangeRuntimeSnapshot> Exchanges);

// Behandler exchange runtime snapshot.
public sealed record ExchangeRuntimeSnapshot(
    string ExchangeCode,
    bool HistoricalSyncRunning,
    DateTime? HistoricalSyncStartedAtUtc,
    DateTime? HistoricalSyncCompletedAtUtc,
    bool RealtimeConnected,
    DateTime? RealtimeConnectedAtUtc,
    DateTime? LastRealtimeMessageAtUtc,
    string? LastError,
    DateTime? LastErrorAtUtc,
    long ValidationErrorCount,
    long ValidationWarningCount);
