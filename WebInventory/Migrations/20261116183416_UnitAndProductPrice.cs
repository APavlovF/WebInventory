using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebInventory.Migrations
{
    /// <inheritdoc />
    public partial class UnitAndProductPrice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "Quantity",
                table: "UnitStocks",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,4)",
                oldPrecision: 18,
                oldScale: 4);

            migrationBuilder.AddColumn<decimal>(
                name: "Price",
                table: "UnitStocks",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal[]>(
                name: "Commissions",
                table: "Products",
                type: "numeric(18,4)[]",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Markup",
                table: "Products",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "Price",
                table: "Products",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal[]>(
                name: "RetailCommissions",
                table: "Products",
                type: "numeric(18,4)[]",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "WorkCost",
                table: "Products",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Price",
                table: "UnitStocks");

            migrationBuilder.DropColumn(
                name: "Commissions",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Markup",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Price",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "RetailCommissions",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "WorkCost",
                table: "Products");

            migrationBuilder.AlterColumn<decimal>(
                name: "Quantity",
                table: "UnitStocks",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);
        }
    }
}
