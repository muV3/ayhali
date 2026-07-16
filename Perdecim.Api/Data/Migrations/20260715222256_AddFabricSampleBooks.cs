using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Perdecim.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFabricSampleBooks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FabricSampleBookId",
                table: "Products",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "FabricSampleBooks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FabricSampleBooks", x => x.Id);
                });

            migrationBuilder.Sql(
                """
                INSERT INTO "FabricSampleBooks" ("Name", "CreatedAt")
                VALUES ('Genel Koleksiyon', now());
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Products_FabricSampleBookId",
                table: "Products",
                column: "FabricSampleBookId");

            migrationBuilder.CreateIndex(
                name: "IX_FabricSampleBooks_Name",
                table: "FabricSampleBooks",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Products_FabricSampleBooks_FabricSampleBookId",
                table: "Products",
                column: "FabricSampleBookId",
                principalTable: "FabricSampleBooks",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Products_FabricSampleBooks_FabricSampleBookId",
                table: "Products");

            migrationBuilder.DropTable(
                name: "FabricSampleBooks");

            migrationBuilder.DropIndex(
                name: "IX_Products_FabricSampleBookId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "FabricSampleBookId",
                table: "Products");
        }
    }
}
