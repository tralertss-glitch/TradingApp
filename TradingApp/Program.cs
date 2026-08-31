using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using TradingAppLibrary.BackgroundServices;
using TradingAppLibrary.Data;
using TradingAppLibrary.Hubs;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Models;
using TradingAppLibrary.Repositories;
using TradingAppLibrary.Services;
using TradingAppLibrary.Validators;

var builder = WebApplication.CreateBuilder(args);

// -------------------------------------------------------------
// 1. DATABASE (PostgreSQL / TimescaleDB)
// -------------------------------------------------------------
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// -------------------------------------------------------------
// 2. HTTP-KLIENTER TIL EXCHANGES
// -------------------------------------------------------------
builder.Services.AddHttpClient<BinanceService>(client =>
{
    client.BaseAddress = new Uri("https://api.binance.com");
    client.Timeout = TimeSpan.FromSeconds(30);
});

builder.Services.AddHttpClient<OkxService>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Exchanges:OKX:RestBaseUrl"] ?? "https://www.okx.com");
    client.Timeout = TimeSpan.FromSeconds(30);
});

builder.Services.AddTransient<IExchangeService>(serviceProvider =>
    serviceProvider.GetRequiredService<BinanceService>());
builder.Services.AddTransient<IExchangeService>(serviceProvider =>
    serviceProvider.GetRequiredService<OkxService>());

builder.Services.AddScoped<IExchangeServiceFactory, ExchangeServiceFactory>();
builder.Services.AddScoped<IMarketDataSyncService, MarketDataSyncService>();
builder.Services.AddSingleton<ICandleValidator, CandleValidator>();
builder.Services.AddSingleton<IMarketDataRuntimeState, TradingAppLibrary.Runtime.MarketDataRuntimeState>();
builder.Services.AddSingleton<IHistoricalSyncQueue, TradingAppLibrary.Runtime.HistoricalSyncQueue>();
builder.Services.AddSingleton<IMarketDataStreamControl, TradingAppLibrary.Runtime.MarketDataStreamControl>();
builder.Services.AddScoped<ISystemHealthService, SystemHealthService>();

// -------------------------------------------------------------
// 3. APPLIKATIONSSERVICES
// -------------------------------------------------------------
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddScoped<IEmailService, SmtpEmailService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ICandleService, CandleService>();
builder.Services.AddScoped<ISymbolService, SymbolService>();
builder.Services.AddScoped<IWatchlistService, WatchlistService>();
builder.Services.AddScoped<IAiAnalysisService, AiAnalysisService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IChartDrawingService, ChartDrawingService>();
builder.Services.AddScoped<IExchangeManagementService, ExchangeManagementService>();

// -------------------------------------------------------------
// 4. REPOSITORIES
// -------------------------------------------------------------
builder.Services.AddScoped<ICandleRepository, CandleRepository>();
builder.Services.AddScoped<ISymbolRepository, SymbolRepository>();
builder.Services.AddScoped<IWatchlistRepository, WatchlistRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IExchangeRepository, ExchangeRepository>();

// -------------------------------------------------------------
// 5. BAGGRUNDSSERVICE TIL MARKET DATA FRA FLERE EXCHANGES
// -------------------------------------------------------------
builder.Services.AddHostedService<MarketDataSyncBackgroundService>();
builder.Services.AddHostedService<HistoricalSyncBackgroundService>();

// -------------------------------------------------------------
// 6. SIGNALR + JSON
// -------------------------------------------------------------
builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.PayloadSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    });

// -------------------------------------------------------------
// 7. CORS
// -------------------------------------------------------------
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",
                "http://localhost:5173",
                "http://localhost:4200",
                "http://localhost:50085")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// -------------------------------------------------------------
// 8. JWT-AUTENTIFICERING + SIGNALR-TOKEN
// -------------------------------------------------------------
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
builder.Services.Configure<JwtSettings>(jwtSettings);

var secretKey = jwtSettings["Secret"] ?? "SuperSecretKey_TradingApp_2026_123456";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        RoleClaimType = ClaimTypes.Role,
        NameClaimType = ClaimTypes.Name
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;

            if (!string.IsNullOrEmpty(accessToken) &&
                path.StartsWithSegments("/hubs/market-data"))
            {
                context.Token = accessToken;
            }

            return Task.CompletedTask;
        }
    };
});

// -------------------------------------------------------------
// 9. CONTROLLERS / REST JSON
// -------------------------------------------------------------
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    });

builder.Services.AddEndpointsApiExplorer();

// -------------------------------------------------------------
// 10. SWAGGER / OPENAPI
// -------------------------------------------------------------
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "TradingApp API",
        Version = "v1"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT token girin."
    });

    c.AddSecurityRequirement(_ => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer"),
            new List<string>()
        }
    });
});

var app = builder.Build();

// -------------------------------------------------------------
// HTTP-PIPELINE
// -------------------------------------------------------------
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Trading API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();
app.UseCors("CorsPolicy");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<MarketDataHub>("/hubs/market-data");

// -------------------------------------------------------------
// OPRET SUPERADMIN-STARTDATA
// -------------------------------------------------------------
using (var scope = app.Services.CreateScope())
{
    var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
    var userService = scope.ServiceProvider.GetRequiredService<IUserService>();

    await DbInitializer.SeedSuperAdminAsync(authService, userService);
}

app.Run();
