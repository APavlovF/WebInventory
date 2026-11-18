using System.Text;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;

namespace WebInventory.Services;

public class PdfService
{
    public static string ExtractText(byte[] pdfBytes)
    {
        StringBuilder sb = new StringBuilder();
        using PdfDocument document = PdfDocument.Open(pdfBytes);
        foreach (Page page in document.GetPages())
        {
            sb.AppendLine($"--- Page {page.Number} ---");
            sb.AppendLine(page.Text);
        }

        return sb.ToString().Trim();
    }
}