using Perdecim.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Perdecim.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Color> Colors => Set<Color>();
    public DbSet<Size> Sizes => Set<Size>();
    public DbSet<Style> Styles => Set<Style>();
    public DbSet<Material> Materials => Set<Material>();
    public DbSet<ProductSize> ProductSizes => Set<ProductSize>();
    public DbSet<ProductColor> ProductColors => Set<ProductColor>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<Inquiry> Inquiries => Set<Inquiry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureProducts(modelBuilder);
        ConfigureLookupTables(modelBuilder);
        ConfigureAdminUsers(modelBuilder);
        ConfigureInquiries(modelBuilder);
        SeedLookupData(modelBuilder);
    }

    private static void ConfigureProducts(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasIndex(product => product.Code).IsUnique();

            entity.Property(product => product.Name).HasMaxLength(200).IsRequired();
            entity.Property(product => product.Code).HasMaxLength(100).IsRequired();
            entity.Property(product => product.CreatedAt).HasDefaultValueSql("now()");
            entity.Property(product => product.IsAvailable).HasDefaultValue(true);

            entity.HasOne(product => product.Category)
                .WithMany(category => category.Products)
                .HasForeignKey(product => product.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(product => product.Style)
                .WithMany(style => style.Products)
                .HasForeignKey(product => product.StyleId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(product => product.Material)
                .WithMany(material => material.Products)
                .HasForeignKey(product => product.MaterialId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ProductImage>(entity =>
        {
            entity.Property(image => image.ImageUrl).HasMaxLength(500).IsRequired();

            entity.HasOne(image => image.Product)
                .WithMany(product => product.Images)
                .HasForeignKey(image => image.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProductSize>(entity =>
        {
            entity.HasKey(productSize => new { productSize.ProductId, productSize.SizeId });
            entity.Property(productSize => productSize.StockQuantity).HasDefaultValue(0);

            entity.HasOne(productSize => productSize.Product)
                .WithMany(product => product.ProductSizes)
                .HasForeignKey(productSize => productSize.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(productSize => productSize.Size)
                .WithMany(size => size.ProductSizes)
                .HasForeignKey(productSize => productSize.SizeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ProductColor>(entity =>
        {
            entity.HasKey(productColor => new { productColor.ProductId, productColor.ColorId });

            entity.HasOne(productColor => productColor.Product)
                .WithMany(product => product.ProductColors)
                .HasForeignKey(productColor => productColor.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(productColor => productColor.Color)
                .WithMany(color => color.ProductColors)
                .HasForeignKey(productColor => productColor.ColorId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureLookupTables(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasIndex(category => category.Name).IsUnique();
            entity.Property(category => category.Name).HasMaxLength(100).IsRequired();
        });

        modelBuilder.Entity<Color>(entity =>
        {
            entity.HasIndex(color => color.Name).IsUnique();
            entity.Property(color => color.Name).HasMaxLength(100).IsRequired();
        });

        modelBuilder.Entity<Size>(entity =>
        {
            entity.HasIndex(size => size.Name).IsUnique();
            entity.Property(size => size.Name).HasMaxLength(50).IsRequired();
        });

        modelBuilder.Entity<Style>(entity =>
        {
            entity.HasIndex(style => style.Name).IsUnique();
            entity.Property(style => style.Name).HasMaxLength(100).IsRequired();
        });

        modelBuilder.Entity<Material>(entity =>
        {
            entity.HasIndex(material => material.Name).IsUnique();
            entity.Property(material => material.Name).HasMaxLength(100).IsRequired();
        });
    }

    private static void ConfigureAdminUsers(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AdminUser>(entity =>
        {
            entity.HasIndex(adminUser => adminUser.Email).IsUnique();
            entity.Property(adminUser => adminUser.Email).HasMaxLength(200).IsRequired();
            entity.Property(adminUser => adminUser.PasswordHash).IsRequired();
            entity.Property(adminUser => adminUser.Role).HasMaxLength(50).HasDefaultValue("Admin").IsRequired();
            entity.Property(adminUser => adminUser.CreatedAt).HasDefaultValueSql("now()");
        });
    }

    private static void ConfigureInquiries(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Inquiry>(entity =>
        {
            entity.Property(inquiry => inquiry.CustomerName).HasMaxLength(150);
            entity.Property(inquiry => inquiry.CustomerPhone).HasMaxLength(50);
            entity.Property(inquiry => inquiry.Source).HasMaxLength(100);
            entity.Property(inquiry => inquiry.CreatedAt).HasDefaultValueSql("now()");

            entity.HasOne(inquiry => inquiry.Product)
                .WithMany()
                .HasForeignKey(inquiry => inquiry.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void SeedLookupData(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Category>().HasData(
            new Category { Id = 1, Name = "Fon Perde" },
            new Category { Id = 2, Name = "Tül Perde" },
            new Category { Id = 3, Name = "Zebra Perde" },
            new Category { Id = 4, Name = "Stor Perde" },
            new Category { Id = 5, Name = "Blackout Perde" },
            new Category { Id = 6, Name = "Kruvaze Perde" });

        modelBuilder.Entity<Size>().HasData(
            new Size { Id = 1, Name = "80x150" },
            new Size { Id = 2, Name = "120x180" },
            new Size { Id = 3, Name = "160x230" },
            new Size { Id = 4, Name = "200x300" });

        modelBuilder.Entity<Color>().HasData(
            new Color { Id = 1, Name = "Bej" },
            new Color { Id = 2, Name = "Gri" },
            new Color { Id = 3, Name = "Krem" },
            new Color { Id = 4, Name = "Lacivert" },
            new Color { Id = 5, Name = "Kahverengi" },
            new Color { Id = 6, Name = "Yeşil" },
            new Color { Id = 7, Name = "Siyah" });

        modelBuilder.Entity<Style>().HasData(
            new Style { Id = 1, Name = "Modern" },
            new Style { Id = 2, Name = "Klasik" },
            new Style { Id = 3, Name = "Minimal" },
            new Style { Id = 4, Name = "Vintage" },
            new Style { Id = 5, Name = "Bohem" },
            new Style { Id = 6, Name = "Çeyizlik" });

        modelBuilder.Entity<Material>().HasData(
            new Material { Id = 1, Name = "Akrilik" },
            new Material { Id = 2, Name = "Yün" },
            new Material { Id = 3, Name = "Polyester" },
            new Material { Id = 4, Name = "Bambu" },
            new Material { Id = 5, Name = "Viskon" },
            new Material { Id = 6, Name = "Pamuk" });
    }
}

