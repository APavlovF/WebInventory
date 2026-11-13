using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebInventory.Migrations
{
    /// <inheritdoc />
    public partial class StockLimits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "LowStockAlert",
                table: "UnitStocks",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "MaxStockAlert",
                table: "UnitStocks",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "LowStockAlert",
                table: "ProductStocks",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MaxStockAlert",
                table: "ProductStocks",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LowStockAlert",
                table: "UnitStocks");

            migrationBuilder.DropColumn(
                name: "MaxStockAlert",
                table: "UnitStocks");

            migrationBuilder.DropColumn(
                name: "LowStockAlert",
                table: "ProductStocks");

            migrationBuilder.DropColumn(
                name: "MaxStockAlert",
                table: "ProductStocks");
        }
    }
}
