using System.Text.RegularExpressions;

namespace Perdecim.Api.Helpers;

public static partial class ProductImageVariants
{
    public const int SmallWidth = 800;
    public const int MediumWidth = 1200;
    public const int LargeWidth = 2000;

    public static IReadOnlyList<int> GetTargetWidths(int sourceWidth)
    {
        var maximumWidth = Math.Min(sourceWidth, LargeWidth);
        return
        [
            .. new[]
            {
                Math.Min(SmallWidth, maximumWidth),
                Math.Min(MediumWidth, maximumWidth),
                maximumWidth
            }
            .Where(width => width > 0)
            .Distinct()
            .Order()
        ];
    }

    public static string GetVariantUrl(string imageUrl, int preferredWidth)
    {
        var match = GeneratedVariantPattern().Match(imageUrl);
        if (!match.Success || !int.TryParse(match.Groups["width"].Value, out var maximumWidth))
        {
            return imageUrl;
        }

        var width = Math.Min(preferredWidth, maximumWidth);
        return $"{match.Groups["prefix"].Value}{match.Groups["stem"].Value}-{width}.webp";
    }

    public static int? GetVariantWidth(string imageUrl, int preferredWidth)
    {
        var match = GeneratedVariantPattern().Match(imageUrl);
        return match.Success && int.TryParse(match.Groups["width"].Value, out var maximumWidth)
            ? Math.Min(preferredWidth, maximumWidth)
            : null;
    }

    public static string? GetVariantFamilyPrefix(string imageUrl)
    {
        var match = GeneratedVariantPattern().Match(imageUrl);
        return match.Success
            ? $"{match.Groups["prefix"].Value}{match.Groups["stem"].Value}-"
            : null;
    }

    public static IReadOnlyList<string> GetStoredVariantUrls(string imageUrl)
    {
        if (GetVariantFamilyPrefix(imageUrl) is null)
        {
            return [imageUrl];
        }

        return GetTargetWidths(GetVariantWidth(imageUrl, LargeWidth)!.Value)
            .Select(width => GetVariantUrl(imageUrl, width))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    [GeneratedRegex(@"^(?<prefix>.*[\\/])?(?<stem>\d+-[a-f0-9]{32})-(?<width>\d{1,5})\.webp$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex GeneratedVariantPattern();
}
