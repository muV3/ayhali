using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perdecim.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerHomeImageFavorites : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsFavorite",
                table: "CustomerHomeImages",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql(
                """
                UPDATE "CustomerHomeImages"
                SET "IsFavorite" = TRUE
                WHERE "Id" IN (
                    SELECT "Id"
                    FROM "CustomerHomeImages"
                    ORDER BY "DisplayOrder", "Id"
                    LIMIT 10
                );
                """);

            migrationBuilder.CreateIndex(
                name: "IX_CustomerHomeImages_IsFavorite",
                table: "CustomerHomeImages",
                column: "IsFavorite");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CustomerHomeImages_IsFavorite",
                table: "CustomerHomeImages");

            migrationBuilder.DropColumn(
                name: "IsFavorite",
                table: "CustomerHomeImages");
        }
    }
}
