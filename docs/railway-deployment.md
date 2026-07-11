# Railway Deployment Notes

## API service

Set the API service root directory to `Perdecim.Api`.

Railway should build the API from `Perdecim.Api/Dockerfile`.

Railway can use `Perdecim.Api/railway.json`.

Required variables:

```text
ASPNETCORE_ENVIRONMENT=Production
DATABASE_URL=<Railway PostgreSQL DATABASE_URL>
Database__ApplyMigrationsOnStartup=true
Jwt__Issuer=Perdecim.Api
Jwt__Audience=Perdecim.Admin
Jwt__Secret=<strong random secret>
Jwt__ExpirationMinutes=120
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

After the first successful deploy, consider setting `Database__ApplyMigrationsOnStartup=false` and running migrations deliberately during future releases.

## Frontend service

Set the frontend service root directory to `perdecim-client`.

Railway can use `perdecim-client/railway.json`.

Build command:

```text
npm ci && npm run build
```

Start command:

```text
npm run start
```

Required variables:

```text
VITE_API_BASE_URL=https://<api-domain>
VITE_WHATSAPP_NUMBER=<phone number with country code>
```
