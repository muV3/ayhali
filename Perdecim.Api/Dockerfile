FROM mcr.microsoft.com/dotnet/sdk:10.0.301 AS build
WORKDIR /src

COPY Perdecim.Api.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish Perdecim.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0.8 AS final
WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

COPY --from=build --chown=app:app /app/publish ./
RUN mkdir -p /app/wwwroot/uploads/products && chown -R app:app /app/wwwroot
USER app
ENTRYPOINT ["dotnet", "Perdecim.Api.dll"]
