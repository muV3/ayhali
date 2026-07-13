# Railway Deployment Notes

## API service

Set the API service root directory to `Perdecim.Api`.

Railway should build the API from `Perdecim.Api/Dockerfile`.

Railway can use `Perdecim.Api/railway.json`.

Health check path:

```text
/api/health
```

Use `/api/health/ready` when you want to manually confirm database connectivity after deployment.

Railway checks the container over HTTP after terminating TLS at the edge, so the API intentionally skips ASP.NET Core HTTPS redirection when `PORT` is present.

Required variables:

```text
ASPNETCORE_ENVIRONMENT=Production
DATABASE_URL=<Railway PostgreSQL DATABASE_URL>
Database__ApplyMigrationsOnStartup=true
Jwt__Issuer=Perdecim.Api
Jwt__Audience=Perdecim.Admin
Jwt__Secret=<strong random secret>
Jwt__ExpirationMinutes=60
Admin__Email=<initial admin email>
Admin__Password=<initial admin password>
Cors__AllowedOrigins__0=https://<frontend-domain>
Storage__Provider=S3
Storage__Endpoint=<Railway bucket S3 endpoint>
Storage__BucketName=<bucket name>
Storage__AccessKeyId=<access key>
Storage__SecretAccessKey=<secret key>
Storage__Region=us-east-1
Storage__ProductImagePrefix=products
```

You can use `ConnectionStrings__DefaultConnection=<Npgsql connection string>` instead of `DATABASE_URL` if you prefer explicit .NET-style connection strings.

When `DATABASE_URL` is present, the API prefers it over the local fallback connection string in `appsettings.json`.

After the first successful deploy, consider setting `Database__ApplyMigrationsOnStartup=false` and running migrations deliberately during future releases.

After the initial admin user has been created, remove `Admin__Email` and `Admin__Password` from the API service variables. They are bootstrap values and are not needed for normal login.

Keep database and bucket credentials as Railway service references where possible. Never put secrets in a `VITE_` variable because Vite embeds those values in the public frontend bundle.

## Local development secrets

The repository does not contain local database, JWT, or admin credentials. Configure them with .NET User Secrets:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=perdecim_dev;Username=<user>;Password=<password>" --project .\Perdecim.Api\Perdecim.Api.csproj
dotnet user-secrets set "Jwt:Secret" "<at-least-32-random-characters>" --project .\Perdecim.Api\Perdecim.Api.csproj
dotnet user-secrets set "Admin:Email" "<admin-email>" --project .\Perdecim.Api\Perdecim.Api.csproj
dotnet user-secrets set "Admin:Password" "<strong-bootstrap-password>" --project .\Perdecim.Api\Perdecim.Api.csproj
```

## Frontend service

Set the frontend service root directory to `perdecim-client`.

Railway can use `perdecim-client/railway.json`.

Build command:

```text
npm run build
```

Start command:

```text
npm run start
```

Required variables:

```text
NIXPACKS_NODE_VERSION=22
VITE_API_BASE_URL=https://<api-domain>
```
