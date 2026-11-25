using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using QuestPDF.Infrastructure;
using System.Text;
using Google.GenAI;
using OpenAI;
using WebInventory.Data;
using WebInventory.DataAi;
using WebInventory.InvoiceAi;
using WebInventory.Services;

QuestPDF.Settings.License = LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddTransient(typeof(GroqParser<>));
builder.Services.Configure<InvoiceParserOptions>(builder.Configuration.GetSection(InvoiceParserOptions.SectionName));
builder.Services.Configure<MaterialsParserOptions>(builder.Configuration.GetSection(MaterialsParserOptions.SectionName));
builder.Services.Configure<ProductsParserOptions>(builder.Configuration.GetSection(ProductsParserOptions.SectionName));

builder.Services.AddSingleton(new Client(apiKey: builder.Configuration["GEMINI_API_KEY"]));
builder.Services.AddScoped(typeof(GeminiParser<>));

builder.Services.AddSingleton(_ => new OpenAIClient(apiKey: builder.Configuration["Groq:ApiKey"]));
builder.Services.Configure<GroqOptions>(builder.Configuration.GetSection("Groq"));
builder.Services.AddHttpClient<IAiClient, GroqAiClient>(client =>
{
    client.BaseAddress = new Uri("https://api.groq.com/openai/v1/");
});

builder.Services.AddSingleton<JwtService>();
builder.Services.AddSingleton<PasswordService>();

builder.Services.AddScoped<IFileWriter, CsvWriter>();
builder.Services.AddScoped<IFileWriterFactory, FileWriterFactory>();
builder.Services.AddScoped<IFileWriter, PdfFileWriter>();
builder.Services.AddScoped<IFileWriter, TxtFileWriter>();
builder.Services.AddScoped<IFileWriter, XlsxFileWriter>();

builder.Services.AddTransient<DapperDbContext>();
builder.Services.AddTransient<IDatabaseReader, DapperReader>();

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
        policy.WithOrigins("http://localhost:56951", "https://apavlovf.github.io", "http://127.0.0.1:3000")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithExposedHeaders("Content-Disposition");
    });
});

var app = builder.Build();

app.UseCors("AllowUI");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
