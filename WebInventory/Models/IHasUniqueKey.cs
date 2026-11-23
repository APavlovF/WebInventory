using System.Linq.Expressions;

namespace WebInventory.Models;

public interface IHasUniqueKey<TSelf> where TSelf : IHasUniqueKey<TSelf>
{
    string GetUniqueKey();

    static abstract Expression<Func<TSelf, bool>> MatchesUniqueKeyOf(TSelf candidate);

    void TrimKeyProperties();
}