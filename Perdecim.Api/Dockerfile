FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Perdecim.Api.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish Perdecim.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

COPY --from=build /app/publish ./
ENTRYPOINT ["dotnet", "Perdecim.Api.dll"]
