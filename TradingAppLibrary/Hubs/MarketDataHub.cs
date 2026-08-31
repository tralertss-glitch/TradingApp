using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace TradingAppLibrary.Hubs;

public class MarketDataHub : Hub
{
    // Henter symbol group.
    public static string GetSymbolGroup(string exchangeCode, string symbolName) =>
        $"{exchangeCode.Trim().ToUpperInvariant()}:{symbolName.Trim().ToUpperInvariant()}";

    // Abonnerer på to symbol.
    public async Task SubscribeToSymbol(string exchangeCode, string symbolName)
    {
        if (!string.IsNullOrWhiteSpace(exchangeCode) && !string.IsNullOrWhiteSpace(symbolName))
            await Groups.AddToGroupAsync(Context.ConnectionId, GetSymbolGroup(exchangeCode, symbolName));
    }

    // Afmelder from symbol.
    public async Task UnsubscribeFromSymbol(string exchangeCode, string symbolName)
    {
        if (!string.IsNullOrWhiteSpace(exchangeCode) && !string.IsNullOrWhiteSpace(symbolName))
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GetSymbolGroup(exchangeCode, symbolName));
    }

    // Behandler connected.
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier
                     ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? Context.User?.FindFirst("id")?.Value;

        if (!string.IsNullOrWhiteSpace(userId))
            await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");

        await base.OnConnectedAsync();
    }

    // Behandler disconnected.
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier
                     ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? Context.User?.FindFirst("id")?.Value;

        if (!string.IsNullOrWhiteSpace(userId))
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"User_{userId}");

        await base.OnDisconnectedAsync(exception);
    }
}
