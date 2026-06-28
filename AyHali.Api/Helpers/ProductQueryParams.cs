namespace AyHali.Api.Helpers;

public class ProductQueryParams
{
    private const int MaxPageSize = 60;
    private int _page = 1;
    private int _pageSize = 12;

    public int? CategoryId { get; set; }
    public int? ColorId { get; set; }
    public int? SizeId { get; set; }
    public int? StyleId { get; set; }
    public int? MaterialId { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public bool? IsDiscounted { get; set; }
    public bool? IsAvailable { get; set; }
    public bool? IsFeatured { get; set; }
    public string? Search { get; set; }
    public string? SortBy { get; set; } = "newest";

    public int Page
    {
        get => _page;
        set => _page = value < 1 ? 1 : value;
    }

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value < 1 ? 12 : Math.Min(value, MaxPageSize);
    }
}
