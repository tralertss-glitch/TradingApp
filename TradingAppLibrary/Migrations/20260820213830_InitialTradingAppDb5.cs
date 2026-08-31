using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace TradingAppLibrary.Migrations
{
    /// <inheritdoc />
    public partial class InitialTradingAppDb5 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Exchanges",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Exchanges", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserPreferences",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    SettingsJson = table.Column<string>(type: "text", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPreferences", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FirstName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    LastName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Username = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    DeletionRequestedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PasswordResetTokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    PasswordResetTokenExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Symbols",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ExchangeId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    BaseAsset = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    QuoteAsset = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Symbols", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Symbols_Exchanges_ExchangeId",
                        column: x => x.ExchangeId,
                        principalTable: "Exchanges",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Watchlists",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    UserId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Watchlists", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Watchlists_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Alerts",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    SymbolId = table.Column<int>(type: "integer", nullable: false),
                    TargetPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    Condition = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsTriggered = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    Note = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Alerts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Alerts_Symbols_SymbolId",
                        column: x => x.SymbolId,
                        principalTable: "Symbols",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Candles",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OpenTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SymbolId = table.Column<int>(type: "integer", nullable: false),
                    Interval = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Open = table.Column<decimal>(type: "numeric", nullable: false),
                    High = table.Column<decimal>(type: "numeric", nullable: false),
                    Low = table.Column<decimal>(type: "numeric", nullable: false),
                    Close = table.Column<decimal>(type: "numeric", nullable: false),
                    Volume = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Candles", x => new { x.Id, x.OpenTime });
                    table.ForeignKey(
                        name: "FK_Candles_Symbols_SymbolId",
                        column: x => x.SymbolId,
                        principalTable: "Symbols",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ChartDrawings",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    SymbolId = table.Column<int>(type: "integer", nullable: false),
                    Interval = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    DrawingType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    DataJson = table.Column<string>(type: "jsonb", nullable: false),
                    IsVisible = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChartDrawings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChartDrawings_Symbols_SymbolId",
                        column: x => x.SymbolId,
                        principalTable: "Symbols",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ChartDrawings_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WatchlistItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WatchlistId = table.Column<int>(type: "integer", nullable: false),
                    SymbolId = table.Column<int>(type: "integer", nullable: false),
                    AddedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WatchlistItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WatchlistItems_Symbols_SymbolId",
                        column: x => x.SymbolId,
                        principalTable: "Symbols",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WatchlistItems_Watchlists_WatchlistId",
                        column: x => x.WatchlistId,
                        principalTable: "Watchlists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Exchanges",
                columns: new[] { "Id", "Code", "IsActive", "Name" },
                values: new object[] { 1, "BINANCE", true, "Binance" });

            migrationBuilder.CreateIndex(
                name: "IX_Alerts_SymbolId_IsActive_IsTriggered",
                table: "Alerts",
                columns: new[] { "SymbolId", "IsActive", "IsTriggered" });

            migrationBuilder.CreateIndex(
                name: "IX_Alerts_UserId",
                table: "Alerts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Candles_SymbolId_Interval_OpenTime",
                table: "Candles",
                columns: new[] { "SymbolId", "Interval", "OpenTime" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChartDrawings_SymbolId",
                table: "ChartDrawings",
                column: "SymbolId");

            migrationBuilder.CreateIndex(
                name: "IX_ChartDrawings_UserId_SymbolId_Interval",
                table: "ChartDrawings",
                columns: new[] { "UserId", "SymbolId", "Interval" });

            migrationBuilder.CreateIndex(
                name: "IX_Exchanges_Code",
                table: "Exchanges",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Symbols_ExchangeId_IsActive",
                table: "Symbols",
                columns: new[] { "ExchangeId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Symbols_ExchangeId_Name",
                table: "Symbols",
                columns: new[] { "ExchangeId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserPreferences_UserId",
                table: "UserPreferences",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Username",
                table: "Users",
                column: "Username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WatchlistItems_SymbolId",
                table: "WatchlistItems",
                column: "SymbolId");

            migrationBuilder.CreateIndex(
                name: "IX_WatchlistItems_WatchlistId_SymbolId",
                table: "WatchlistItems",
                columns: new[] { "WatchlistId", "SymbolId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Watchlists_UserId",
                table: "Watchlists",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Alerts");

            migrationBuilder.DropTable(
                name: "Candles");

            migrationBuilder.DropTable(
                name: "ChartDrawings");

            migrationBuilder.DropTable(
                name: "UserPreferences");

            migrationBuilder.DropTable(
                name: "WatchlistItems");

            migrationBuilder.DropTable(
                name: "Symbols");

            migrationBuilder.DropTable(
                name: "Watchlists");

            migrationBuilder.DropTable(
                name: "Exchanges");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
