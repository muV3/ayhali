using AyHali.Api.Data;
using AyHali.Api.DTOs.Attributes;
using AyHali.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace AyHali.Api.Services;

public class LookupService(AppDbContext dbContext)
{
    public async Task<IReadOnlyList<AttributeDto>> GetAllAsync<TEntity>(CancellationToken cancellationToken)
        where TEntity : class, ILookupEntity
    {
        return await dbContext.Set<TEntity>()
            .AsNoTracking()
            .OrderBy(item => item.Name)
            .Select(item => new AttributeDto
            {
                Id = item.Id,
                Name = item.Name
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<(AttributeDto? Attribute, string? Error)> CreateAsync<TEntity>(
        UpsertAttributeDto dto,
        CancellationToken cancellationToken)
        where TEntity : class, ILookupEntity, new()
    {
        var name = dto.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return (null, "Name is required.");
        }

        if (await NameExistsAsync<TEntity>(name, null, cancellationToken))
        {
            return (null, "An attribute with this name already exists.");
        }

        var entity = new TEntity { Name = name };
        dbContext.Set<TEntity>().Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);

        return (ToDto(entity), null);
    }

    public async Task<(AttributeDto? Attribute, string? Error)> UpdateAsync<TEntity>(
        int id,
        UpsertAttributeDto dto,
        CancellationToken cancellationToken)
        where TEntity : class, ILookupEntity
    {
        var entity = await dbContext.Set<TEntity>().FindAsync([id], cancellationToken);
        if (entity is null)
        {
            return (null, null);
        }

        var name = dto.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return (null, "Name is required.");
        }

        if (await NameExistsAsync<TEntity>(name, id, cancellationToken))
        {
            return (null, "An attribute with this name already exists.");
        }

        entity.Name = name;
        await dbContext.SaveChangesAsync(cancellationToken);

        return (ToDto(entity), null);
    }

    public async Task<(bool Deleted, bool Conflict)> DeleteAsync<TEntity>(
        int id,
        CancellationToken cancellationToken)
        where TEntity : class, ILookupEntity
    {
        var entity = await dbContext.Set<TEntity>().FindAsync([id], cancellationToken);
        if (entity is null)
        {
            return (false, false);
        }

        dbContext.Set<TEntity>().Remove(entity);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            return (true, false);
        }
        catch (DbUpdateException)
        {
            dbContext.Entry(entity).State = EntityState.Unchanged;
            return (false, true);
        }
    }

    private async Task<bool> NameExistsAsync<TEntity>(
        string name,
        int? existingId,
        CancellationToken cancellationToken)
        where TEntity : class, ILookupEntity
    {
        return await dbContext.Set<TEntity>()
            .AnyAsync(item => item.Name == name && item.Id != existingId, cancellationToken);
    }

    private static AttributeDto ToDto(ILookupEntity entity)
    {
        return new AttributeDto
        {
            Id = entity.Id,
            Name = entity.Name
        };
    }
}
