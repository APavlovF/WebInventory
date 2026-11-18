
using Google.GenAI;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using WebInventory.Data;
using WebInventory.InvoiceAi;
using WebInventory.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<InvoiceParserOptions>(builder.Configuration.GetSection(InvoiceParserOptions.SectionName));

builder.Services.AddSingleton(new Client(apiKey: builder.Configuration["GEMINI_API_KEY"]));
builder.Services.AddTransient<DapperDbContext>();
builder.Services.AddTransient<IDatabaseReader, DapperReader>();
builder.Services.AddTransient<InvoiceParser>();
builder.Services.AddSingleton<JwtService>();
builder.Services.AddSingleton<PasswordService>();

builder.Services.AddControllers();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<EfDbContext>(options => options.UseNpgsql(connectionString));
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
            };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowUI", policy =>
    {
        policy.WithOrigins("http://localhost:56951", "https://apavlovf.github.io")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors("AllowUI");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
