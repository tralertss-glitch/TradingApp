using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TradingAppLibrary.Interfaces;

namespace TradingAppLibrary.BackgroundServices;

public sealed class HistoricalSyncBackgroundService : BackgroundService
{
    private readonly IHistoricalSyncQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IMarketDataRuntimeState _runtimeState;
    private readonly IMarketDataStreamControl _streamControl;
    private readonly ILogger<HistoricalSyncBackgroundService> _logger;

    public HistoricalSyncBackgroundService(
        IHistoricalSyncQueue queue,
        IServiceScopeFactory scopeFactory,
        IMarketDataRuntimeState runtimeState,
        IMarketDataStreamControl streamControl,
        ILogger<HistoricalSyncBackgroundService> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _runtimeState = runtimeState;
        _streamControl = streamControl;
        _logger = logger;
    }

    // Kører den relevante operation.
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Historical sync queue service started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            HistoricalSyncJob job;
            try
            {
                job = await _queue.DequeueAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }

            try
            {
                _runtimeState.SetHistoricalSyncRunning(job.ExchangeCode, true);

                using var scope = _scopeFactory.CreateScope();
                var syncService = scope.ServiceProvider.GetRequiredService<IMarketDataSyncService>();

                _logger.LogInformation(
                    "Queued historical sync started. Exchange={Exchange}, SymbolId={SymbolId}",
                    job.ExchangeCode,
                    job.SymbolId);

                await syncService.SyncHistoricalCandlesAsync(
                    job.SymbolId,
                    "1m",
                    stoppingToken);

                _runtimeState.ClearError(job.ExchangeCode);

                _logger.LogInformation(
                    "Queued historical sync completed. Exchange={Exchange}, SymbolId={SymbolId}",
                    job.ExchangeCode,
                    job.SymbolId);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _runtimeState.RecordError(job.ExchangeCode, ex.Message);
                _logger.LogError(
                    ex,
                    "Queued historical sync failed. Exchange={Exchange}, SymbolId={SymbolId}",
                    job.ExchangeCode,
                    job.SymbolId);
            }
            finally
            {
                _runtimeState.SetHistoricalSyncRunning(job.ExchangeCode, false);
                _queue.Complete(job.SymbolId);

                // Genopbyg exchangens WebSocket-abonnement, når backfill er færdig.
                // Det betyder, at et nyaktiveret symbol først tilsluttes realtime, når historikken er udfyldt.
                _streamControl.RequestRestart(job.ExchangeCode);
            }
        }
    }
}
