using Perdecim.Api.Authentication;
using Perdecim.Api.Data;
using Perdecim.Api.Options;
using Perdecim.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
var isRailwayContainer = !string.IsNullOrWhiteSpace(port);
if (isRailwayContainer)
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

if (isRailwayContainer)
{
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.ForwardLimit = 1;
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
    });
}

// Add services to the container.

var databaseConnectionString = GetDatabaseConnectionString(builder.Configuration);
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        databaseConnectionString,
        npgsqlOptions => npgsqlOptions.EnableRetryOnFailure()));

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
    });
});

builder.Services.AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection("Jwt"))
    .Validate(options => !string.IsNullOrWhiteSpace(options.Issuer), "Jwt:Issuer is required.")
    .Validate(options => !string.IsNullOrWhiteSpace(options.Audience), "Jwt:Audience is required.")
    .Validate(options => options.Secret?.Length >= 32, "Jwt:Secret must be at least 32 characters.")
    .Validate(
        options => builder.Environment.IsDevelopment()
            || !options.Secret.Contains("replace-this-secret", StringComparison.OrdinalIgnoreCase),
        "Jwt:Secret must be replaced in production.")
    .Validate(
        options => options.ExpirationMinutes is >= 5 and <= 120,
        "Jwt:ExpirationMinutes must be between 5 and 120.")
    .ValidateOnStart();
builder.Services.AddOptions<StorageOptions>()
    .Bind(builder.Configuration.GetSection("Storage"))
    .Validate(
        options => string.Equals(options.Provider, "Local", StringComparison.OrdinalIgnoreCase)
            || string.Equals(options.Provider, "S3", StringComparison.OrdinalIgnoreCase),
        "Storage:Provider must be Local or S3.")
    .Validate(
        options => !string.Equals(options.Provider, "S3", StringComparison.OrdinalIgnoreCase)
            || options.UseS3,
        "S3 storage requires a bucket name, access key ID, and secret access key.")
    .Validate(
        options => !string.IsNullOrWhiteSpace(options.ProductImagePrefix)
            && !options.ProductImagePrefix.Contains("..", StringComparison.Ordinal)
            && !options.ProductImagePrefix.Contains('\\'),
        "Storage:ProductImagePrefix must be a non-empty safe path prefix.")
    .ValidateOnStart();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("login", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 5,
                QueueLimit = 0,
                Window = TimeSpan.FromMinutes(1)
            }));
});
builder.Services.AddAuthentication("Bearer")
    .AddScheme<AuthenticationSchemeOptions, BearerAuthenticationHandler>("Bearer", null);
builder.Services.AddAuthorization();

builder.Services.AddHostedService<AdminBootstrapper>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddScoped<PasswordHashService>();
builder.Services.AddScoped<ProductService>();
builder.Services.AddScoped<LookupService>();
builder.Services.AddScoped<ProductImageService>();
builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

if (isRailwayContainer)
{
    app.UseForwardedHeaders();
}

if (app.Configuration.GetValue<bool>("Database:ApplyMigrationsOnStartup"))
{
    try
    {
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await dbContext.Database.MigrateAsync();
    }
    catch (Exception exception)
    {
        app.Logger.LogError(exception, "Database migration failed during startup.");
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else if (!isRailwayContainer)
{
    app.UseHttpsRedirection();
}

app.Use(async (context, next) =>
{
    context.Response.OnStarting(() =>
    {
        context.Response.Headers.XContentTypeOptions = "nosniff";
        context.Response.Headers.XFrameOptions = "DENY";
        context.Response.Headers["Referrer-Policy"] = "no-referrer";
        context.Response.Headers.Append("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
        if (!app.Environment.IsDevelopment())
        {
            context.Response.Headers.StrictTransportSecurity = "max-age=31536000; includeSubDomains";
        }

        return Task.CompletedTask;
    });

    await next();
});
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

static string GetDatabaseConnectionString(IConfiguration configuration)
{
    var databaseUrl = configuration["DATABASE_URL"];
    if (!string.IsNullOrWhiteSpace(databaseUrl) && Uri.TryCreate(databaseUrl, UriKind.Absolute, out var uri))
    {
        var userInfo = uri.UserInfo.Split(':', 2);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = uri.AbsolutePath.TrimStart('/'),
            Username = Uri.UnescapeDataString(userInfo.ElementAtOrDefault(0) ?? string.Empty),
            Password = Uri.UnescapeDataString(userInfo.ElementAtOrDefault(1) ?? string.Empty),
            SslMode = SslMode.Require
        };

        return builder.ConnectionString;
    }

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (!string.IsNullOrWhiteSpace(connectionString))
    {
        return connectionString;
    }

    throw new InvalidOperationException("Database connection is not configured.");
}

