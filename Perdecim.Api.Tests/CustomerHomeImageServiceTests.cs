using Perdecim.Api.Services;

namespace Perdecim.Api.Tests;

public class CustomerHomeImageServiceTests
{
    [Fact]
    public void MaximumFavoriteCount_IsTen()
    {
        Assert.Equal(10, CustomerHomeImageService.MaximumFavoriteCount);
    }

    [Theory]
    [InlineData(9, false, true)]
    [InlineData(10, false, false)]
    [InlineData(10, true, true)]
    public void CanFavorite_EnforcesLimitButAllowsExistingFavorite(
        int favoriteCount,
        bool alreadyFavorite,
        bool expected)
    {
        Assert.Equal(expected, CustomerHomeImageService.CanFavorite(favoriteCount, alreadyFavorite));
    }

    [Fact]
    public void IsValidOrder_AcceptsEveryExistingImageExactlyOnce()
    {
        Assert.True(CustomerHomeImageService.IsValidOrder([3, 1, 2], [1, 2, 3]));
    }

    [Theory]
    [InlineData(new[] { 1, 2 }, new[] { 1, 2, 3 })]
    [InlineData(new[] { 1, 2, 2 }, new[] { 1, 2, 3 })]
    [InlineData(new[] { 1, 2, 4 }, new[] { 1, 2, 3 })]
    public void IsValidOrder_RejectsIncompleteDuplicateOrUnknownIds(int[] requestedIds, int[] existingIds)
    {
        Assert.False(CustomerHomeImageService.IsValidOrder(requestedIds, existingIds));
    }
}
