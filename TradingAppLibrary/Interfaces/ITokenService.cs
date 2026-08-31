using System;
using System.Collections.Generic;
using System.Text;

namespace TradingAppLibrary.Interfaces
{
    public interface ITokenService
    {
        string GenerateToken(int userId, string username, string role);
    }
}
