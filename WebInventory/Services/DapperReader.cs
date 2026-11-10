using Npgsql;
using System.Data;
using Dapper;
using WebInventory.Data;

namespace WebInventory.Services;

public class DapperReader(DapperDbContext context) : IDatabaseReader
{
    public async Task<IEnumerable<T>> Read<T>() where T : class
    {
        string typeName = typeof(T).Name;
        string tableName = typeName;
        if (typeName.EndsWith("y"))
        {
            tableName = typeName[..^1] + "ies";
        }
        else if (!typeName.EndsWith("s"))
        {
            tableName = typeName + "s";
        }

        string sql = $"SELECT * FROM \"{tableName}\"";
        using IDbConnection dbConnection = new NpgsqlConnection(context.GetConnectionString());
        if (dbConnection.State == ConnectionState.Closed) dbConnection.Open();

        return await dbConnection.QueryAsync<T>(sql);
    }
}