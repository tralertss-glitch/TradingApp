using System;
using System.Collections.Generic;
using System.Text;

namespace TradingAppLibrary.Models
{
    public class Watchlist
    {
        public int Id { get; set; }
        public string Name { get; set; } = "Favorilerim";
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        public ICollection<WatchlistItem> Items { get; set; } = new List<WatchlistItem>();
    }
}
