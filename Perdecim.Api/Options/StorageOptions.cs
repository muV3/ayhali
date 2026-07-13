namespace Perdecim.Api.Options;

public class StorageOptions
{
    public string Provider { get; set; } = "Local";
    public string? Endpoint { get; set; }
    public string? PublicBaseUrl { get; set; }
    public string? BucketName { get; set; }
    public string? AccessKeyId { get; set; }
    public string? SecretAccessKey { get; set; }
    public string Region { get; set; } = "us-east-1";
    public string ProductImagePrefix { get; set; } = "products";

    public bool UseS3 =>
        string.Equals(Provider, "S3", StringComparison.OrdinalIgnoreCase)
        && !string.IsNullOrWhiteSpace(BucketName)
        && !string.IsNullOrWhiteSpace(AccessKeyId)
        && !string.IsNullOrWhiteSpace(SecretAccessKey);
}
