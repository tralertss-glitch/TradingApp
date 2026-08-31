using System;
using System.Collections.Generic;
using System.Text;

namespace TradingAppLibrary.Models
{
    public class User
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Role { get; set; } = "User";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletionRequestedAt { get; set; }
        public string? PasswordResetTokenHash { get; set; }
        public DateTime? PasswordResetTokenExpiresAtUtc { get; set; }
        public ICollection<Watchlist> Watchlists { get; set; } = new List<Watchlist>();
        public ICollection<ChartDrawing> ChartDrawings { get; set; } = new List<ChartDrawing>();
    }
}
