using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace TradingAppLibrary.Models
{
    [Table("UserPreferences")]
    public class UserPreferences
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string UserId { get; set; } = string.Empty;

        // Gemmer alle chart-, indikator- og layoutindstillinger som JSON.
        [Required]
        public string SettingsJson { get; set; } = "{}";

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
