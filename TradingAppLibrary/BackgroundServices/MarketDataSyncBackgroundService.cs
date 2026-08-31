using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TradingAppLibrary.Data;
using TradingAppLibrary.Interfaces;

namespace TradingAppLibrary.BackgroundServices;

public class MarketDataSyncBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IMarketDataRuntimeState _runtimeState;
    private readonly IMarketDataStreamControl _streamControl;
    private readonly ILogger<MarketDataSyncBackgroundService> _logger;

    public MarketDataSyncBackgroundService(
        IServiceScopeFactory scopeFactory,
        IMarketDataRuntimeState runtimeState,
        IMarketDataStreamControl streamControl,
        ILogger<MarketDataSyncBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _runtimeState = runtimeState;
        _streamControl = streamControl;
        _logger = logger;
    }

    // Kører den relevante operation.
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Market data sync service started.");

        // Historisk backfill kan tage lang tid. Realtidsstreams må ikke vente på den.
        var initialSyncTask = InitialSyncAsync(stoppingToken);
        var realtimeTask = StartRealtimeStreamsAsync(stoppingToken);

        await Task.WhenAll(initialSyncTask, realtimeTask);
    }

    // Behandler initial sync.
    private async Task InitialSyncAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var syncService = scope.ServiceProvider.GetRequiredService<IMarketDataSyncService>();

            var exchanges = await db.Exchanges
                .Where(e => e.IsActive)
                .Select(e => e.Code)
                .ToListAsync(cancellationToken);

            foreach (var exchangeCode in exchanges)
            {
                cancellationToken.ThrowIfCancellationRequested();

                try
                {
                    _logger.LogInformation("Syncing symbols for {Exchange}", exchangeCode);
                    await syncService.SyncExchangeSymbolsAsync(exchangeCode, cancellationToken);

                    _runtimeState.SetHistoricalSyncRunning(exchangeCode, true);
                    _logger.LogInformation("Syncing historical candles for {Exchange}", exchangeCode);
                    await syncService.SyncExchangeHistoricalDataAsync(exchangeCode, "1m", cancellationToken);

                    _runtimeState.ClearError(exchangeCode);
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    _runtimeState.RecordError(exchangeCode, ex.Message);
                    _logger.LogError(ex, "Initial market data sync failed for {Exchange}.", exchangeCode);
                }
                finally
                {
                    _runtimeState.SetHistoricalSyncRunning(exchangeCode, false);
                }
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Initial market data sync failed.");
        }
    }

    // Starter realtime-streamen for aktive symboler på den valgte exchange.
    private async Task StartRealtimeStreamsAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var exchanges = await db.Exchanges
            .Where(e => e.IsActive)
            .Select(e => e.Code)
            .ToListAsync(cancellationToken);

        await Task.WhenAll(
            exchanges.Select(code => RunExchangeStreamAsync(code, cancellationToken)));
    }

    // Kører exchange stream.
    private async Task RunExchangeStreamAsync(
        string exchangeCode,
        CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            using var streamCancellation = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            _streamControl.Register(exchangeCode, streamCancellation);

            var restartRequested = false;

            try
            {
                _runtimeState.SetRealtimeConnected(exchangeCode, false);

                using var scope = _scopeFactory.CreateScope();
                var syncService = scope.ServiceProvider.GetRequiredService<IMarketDataSyncService>();

                _logger.LogInformation("Starting realtime stream for {Exchange}", exchangeCode);
                await syncService.StartRealtimeStreamAsync(
                    exchangeCode,
                    "1m",
                    streamCancellation.Token);

                _runtimeState.SetRealtimeConnected(exchangeCode, false);
            }
            catch (OperationCanceledException) when (
                !cancellationToken.IsCancellationRequested &&
                streamCancellation.IsCancellationRequested)
            {
                restartRequested = true;
                _runtimeState.SetRealtimeConnected(exchangeCode, false);
                _logger.LogInformation(
                    "Realtime stream restart requested for {Exchange} because active symbols changed.",
                    exchangeCode);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                _runtimeState.SetRealtimeConnected(exchangeCode, false);
                break;
            }
            catch (Exception ex)
            {
                _runtimeState.SetRealtimeConnected(exchangeCode, false);
                _runtimeState.RecordError(exchangeCode, ex.Message);
                _logger.LogError(ex, "Realtime stream failed for {Exchange}", exchangeCode);
            }
            finally
            {
                _streamControl.Unregister(exchangeCode, streamCancellation);
            }

            if (cancellationToken.IsCancellationRequested)
                break;

            await Task.Delay(
                restartRequested ? TimeSpan.FromMilliseconds(250) : TimeSpan.FromSeconds(5),
                cancellationToken);
        }
    }
}
