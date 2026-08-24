using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perdecim.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeCustomerHomeImageFavorites : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                WITH ranked_favorites AS (
                    SELECT "Id", ROW_NUMBER() OVER (ORDER BY "DisplayOrder", "Id") AS position
                    FROM "CustomerHomeImages"
                    WHERE "IsFavorite" = TRUE
                )
                UPDATE "CustomerHomeImages" AS image
                SET "IsFavorite" = FALSE,
                    "UpdatedAt" = now()
                FROM ranked_favorites
                WHERE image."Id" = ranked_favorites."Id"
                  AND ranked_favorites.position > 10;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Normalized favorite choices cannot be reconstructed safely.
        }
    }
}
