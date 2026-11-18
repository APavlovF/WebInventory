using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using WebInventory.Models;
using Unit = QuestPDF.Infrastructure.Unit;

namespace WebInventory.Services;

public class PdfFileWriter : IFileWriter
{
    public string Format => "pdf";
    public string ContentType => "application/pdf";

    public Task<byte[]> Write<T>(IEnumerable<T> lines, List<ColumnDefinition<T>> columns) where T : class
    {
        List<T> itemList = [.. lines];
        Document document = Document.Create(container =>
        {
            container.Page(page =>
            {
                // Landscape gives tables more horizontal breathing room
                page.Size(PageSizes.A4.Landscape());
                page.Margin(1.5f, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(9));

                // Simple Header
                page.Header()
                    .PaddingBottom(10)
                    .Row(row =>
                    {
                        row.RelativeItem().Text("Export Report").FontSize(14).Bold();
                        row.AutoItem().Text($"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC").FontSize(8).FontColor(Colors.Grey.Darken1);
                    });

                // Data Table
                page.Content().Table(table =>
                {
                    // 1. Define equal-width columns
                    table.ColumnsDefinition(cols =>
                    {
                        foreach (ColumnDefinition<T> _ in columns)
                            cols.RelativeColumn();
                    });

                    // 2. Table Header (repeats automatically on every new page)
                    table.Header(header =>
                    {
                        foreach (ColumnDefinition<T> col in columns)
                        {
                            header.Cell()
                                .Background(Colors.Grey.Lighten3)
                                .BorderBottom(1).BorderColor(Colors.Grey.Medium)
                                .Padding(5)
                                .Text(col.Header).Bold();
                        }
                    });

                    // 3. Data Rows
                    for (int rowIndex = 0; rowIndex < itemList.Count; rowIndex++)
                    {
                        T item = itemList[rowIndex];
                        Color bgColor = rowIndex % 2 == 0 ? Colors.White : Colors.Grey.Lighten5;

                        foreach (ColumnDefinition<T> col in columns)
                        {
                            string textValue = col.ValueSelector(item)?.ToString() ?? string.Empty;

                            table.Cell()
                                .Background(bgColor)
                                .BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2)
                                .Padding(5)
                                .Text(textValue);
                        }
                    }
                });

                // Footer with Page Numbers
                page.Footer()
                    .AlignRight()
                    .Text(x =>
                    {
                        x.Span("Page ");
                        x.CurrentPageNumber();
                        x.Span(" of ");
                        x.TotalPages();
                    });
            });
        });

        // Generate PDF directly into a byte[] in memory
        byte[] pdfBytes = document.GeneratePdf();

        return Task.FromResult(pdfBytes);
    }
}