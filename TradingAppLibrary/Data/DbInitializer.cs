using System;
using System.Collections.Generic;
using System.Text;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Enums;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Models;

namespace TradingAppLibrary.Data
{
    public static class DbInitializer
    {
        // Behandler seed super admin.
        public static async Task SeedSuperAdminAsync(IAuthService authService, IUserService userService)
        {
            const string superAdminEmail = "superadmin@tradingapp.com";

            // 1. Kontroller, om der findes en SuperAdmin.
            var existingUser = await userService.GetUserByEmailAsync(superAdminEmail);

            if (existingUser == null)
            {
                // 2. Gem brugeren (fornavn, efternavn, username, e-mail og password).
                var registerDto = new RegisterDto("Super", "Admin", "superadmin", superAdminEmail, "123456789");
                var authResponse = await authService.RegisterAsync(registerDto);

                if (authResponse != null)
                {
                    // 3. Hent brugeren igen, og sæt rollen til SuperAdmin.
                    var createdUser = await userService.GetUserByEmailAsync(superAdminEmail);
                    if (createdUser != null)
                    {
                        createdUser.Role = UserRole.SuperAdmin.ToString();
                        await userService.UpdateUserAsync(createdUser);
                    }
                }
            }
            else if (existingUser.Role != UserRole.SuperAdmin.ToString())
            {
                // Hvis brugeren allerede findes, men stadig har rollen User, ændres rollen til SuperAdmin.
                existingUser.Role = UserRole.SuperAdmin.ToString();
                await userService.UpdateUserAsync(existingUser);
            }
        }
    }
}
