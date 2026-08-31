using System;
using System.Collections.Generic;
using System.Text;

namespace TradingAppLibrary.DTO
{
    public class IndicatorConfigDto
    {
        public string Id { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool Enabled { get; set; }
        public string Color { get; set; } = "#2962ff";
        public int? Period { get; set; }
        public double? StdDev { get; set; }
        public int? FastPeriod { get; set; }   // Til MACD.
        public int? SlowPeriod { get; set; }   // Til MACD.
        public int? SignalPeriod { get; set; } // Til MACD.
    }

    public class ChartVisualSettingsDto
    {
        // Candle-farver og visuelle indstillinger
        public string UpColor { get; set; } = "#089981";
        public string DownColor { get; set; } = "#f23645";
        public bool ShowBorders { get; set; } = false;
        public bool ShowWicks { get; set; } = true;

        // Gitter og lærred
        public bool ShowGrid { get; set; } = true;
        public string GridColorDark { get; set; } = "#1e222d";
        public string GridColorLight { get; set; } = "#f0f3fa";

        // Prislinje
        public bool ShowPriceLine { get; set; } = true;

        // Alarmer og lyd
        public bool SoundEnabled { get; set; } = true;
    }

    public class UserPreferencesDto
    {
        // Temavalg
        public string Theme { get; set; } = "dark";
        public string Language { get; set; } = "da";
        public string LastSymbol { get; set; } = "BTCUSDT";
        public string LastInterval { get; set; } = "15m";
        public string ChartType { get; set; } = "candles";
        public string LayoutMode { get; set; } = "1x1";
        public List<IndicatorConfigDto> Indicators { get; set; } = new();
        public ChartVisualSettingsDto VisualSettings { get; set; } = new();
    }
}
