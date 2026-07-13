using System.Security.Cryptography;
using Perdecim.Api.Services;

namespace Perdecim.Api.Tests;

public class PasswordHashServiceTests
{
    private readonly PasswordHashService _service = new();

    [Fact]
    public void HashPassword_UsesCurrentWorkFactorAndVerifies()
    {
        var hash = _service.HashPassword("correct horse battery staple");

        Assert.Equal("600000", hash.Split('$')[1]);
        Assert.True(_service.VerifyPassword("correct horse battery staple", hash));
        Assert.False(_service.VerifyPassword("wrong password", hash));
        Assert.False(_service.NeedsRehash(hash));
    }

    [Fact]
    public void VerifyPassword_AcceptsLegacyHashAndMarksItForUpgrade()
    {
        const string password = "legacy password";
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            100_000,
            HashAlgorithmName.SHA256,
            32);
        var storedHash = $"PBKDF2$100000${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";

        Assert.True(_service.VerifyPassword(password, storedHash));
        Assert.True(_service.NeedsRehash(storedHash));
    }

    [Theory]
    [InlineData("")]
    [InlineData("PBKDF2$999999999$invalid$invalid")]
    [InlineData("PBKDF2$600000$invalid$invalid")]
    public void VerifyPassword_RejectsMalformedOrUnsafeHashes(string storedHash)
    {
        Assert.False(_service.VerifyPassword("password", storedHash));
    }
}
