using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Enums;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Mappings;
using TradingAppLibrary.Models;

namespace TradingApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IAuthService _authService;

        public UsersController(IUserService userService, IAuthService authService)
        {
            _userService = userService;
            _authService = authService;
        }

        /// <summary>
        /// Den bruger, der er logget ind, henter sine egne profiloplysninger.
        /// GET: api/users/me
        /// </summary>
        [HttpGet("me")]
        [Authorize] // Alle brugere, der er logget ind, har adgang (User, Admin, SuperAdmin).
        public async Task<ActionResult<UserManagementDto>> GetMyProfile()
        {
            int userId = GetCurrentUserIdFromClaims();

            var user = await _userService.GetUserByIdAsync(userId);
            if (user == null)
                return NotFound(new { message = "Kullanıcı bulunamadı." });

            return Ok(user.ToDto());
        }

        /// <summary>
        /// Den bruger, der er logget ind, opdaterer sine egne profiloplysninger (fornavn, efternavn og e-mail).
        /// PUT: api/users/me
        /// </summary>
        [HttpPut("me")]
        [Authorize]
        public async Task<ActionResult<UserManagementDto>> UpdateMyProfile([FromBody] UserManagementDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest(new { message = "E-posta alanı zorunludur." });
            }

            int userId = GetCurrentUserIdFromClaims();

            var user = await _userService.GetUserByIdAsync(userId);
            if (user == null)
                return NotFound(new { message = "Kullanıcı bulunamadı." });

            user.FirstName = dto.FirstName?.Trim() ?? "";
            user.LastName = dto.LastName?.Trim() ?? "";
            user.Email = dto.Email.Trim().ToLower();

            await _userService.UpdateUserAsync(user);

            return Ok(user.ToDto());
        }

        /// <summary>
        /// Den bruger, der er logget ind, angiver en ny adgangskode efter validering af den nuværende adgangskode.
        /// POST: api/users/change-password
        /// </summary>
        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.CurrentPassword) || string.IsNullOrWhiteSpace(dto.NewPassword))
            {
                return BadRequest(new { message = "Mevcut şifre ve yeni şifre boş bırakılamaz." });
            }

            if (dto.NewPassword.Length < 6)
            {
                return BadRequest(new { message = "Yeni şifre en az 6 karakter olmalıdır." });
            }

            int userId = GetCurrentUserIdFromClaims();

            bool isSuccess = await _userService.ChangePasswordAsync(userId, dto.CurrentPassword, dto.NewPassword);
            if (!isSuccess)
            {
                return BadRequest(new { message = "Mevcut şifreniz hatalı veya geçersiz." });
            }

            return Ok(new { message = "Şifreniz başarıyla değiştirildi." });
        }

        /// <summary>
        /// Henter de gemte chart- og brugerfladeindstillinger for den bruger, der er logget ind.
        /// GET: api/users/preferences
        /// </summary>
        [HttpGet("preferences")]
        [Authorize]
        public async Task<IActionResult> GetPreferences()
        {
            int userId = GetCurrentUserIdFromClaims();

            var preferences = await _userService.GetUserPreferencesAsync(userId.ToString());
            return Ok(preferences);
        }

        /// <summary>
        /// Gemmer eller opdaterer brugerens aktuelle chart- og brugerfladeindstillinger (upsert).
        /// PUT: api/users/preferences
        /// </summary>
        [HttpPut("preferences")]
        [Authorize]
        public async Task<IActionResult> SavePreferences([FromBody] UserPreferencesDto dto)
        {
            if (dto == null)
            {
                return BadRequest(new { message = "Tercih verisi boş olamaz." });
            }

            int userId = GetCurrentUserIdFromClaims();

            await _userService.SaveUserPreferencesAsync(userId.ToString(), dto);
            return Ok(new { message = "Kullanıcı tercihleri başarıyla güncellendi." });
        }

        /// <summary>
        /// Viser alle brugere (kun Admin og SuperAdmin).
        /// GET: api/users
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult<IEnumerable<UserManagementDto>>> GetAllUsers()
        {
            var users = await _userService.GetAllUsersAsync();

            return Ok(users.ToDtoList());
        }

        /// <summary>
        /// Opdaterer brugerens rolle (kun SuperAdmin).
        /// PUT: api/users/assign-role
        /// </summary>
        [HttpPut("assign-role")]
        [Authorize(Roles = nameof(UserRole.SuperAdmin))]
        public async Task<IActionResult> AssignRole([FromBody] UserManagementDto request)
        {
            var user = await _userService.GetUserByIdAsync(request.Id);
            if (user == null)
                return NotFound(new { message = "Kullanıcı bulunamadı." });

            if (!Enum.TryParse<UserRole>(request.Role, true, out var parsedRole) || !Enum.IsDefined(typeof(UserRole), parsedRole))
            {
                return BadRequest(new { message = "Geçersiz rol türü. Geçerli roller: User, Admin, SuperAdmin" });
            }

            user.Role = parsedRole.ToString();
            await _userService.UpdateUserAsync(user);

            return Ok(new { message = $"{user.Username} kullanıcısının yeni rolü '{user.Role}' olarak güncellendi." });
        }

        /// <summary>
        /// Læser den aktive brugers id fra HTTP-contexten (JWT-claim).
        /// </summary>
        private int GetCurrentUserIdFromClaims()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst("sub")?.Value
                           ?? User.FindFirst("id")?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                throw new UnauthorizedAccessException("Geçersiz veya bulunamayan kullanıcı kimliği.");
            }

            return userId;
        }

        /// <summary>
        /// Den bruger, der er logget ind, markerer sin egen konto som slettet (soft delete).
        /// DELETE: api/users/me
        /// </summary>
        [HttpDelete("me")]
        [Authorize]
        public async Task<IActionResult> DeleteMyAccount()
        {
            int userId = GetCurrentUserIdFromClaims();

            bool isSuccess = await _authService.RequestAccountDeletionAsync(userId);
            if (!isSuccess)
            {
                return NotFound(new { message = "Kullanıcı bulunamadı veya hesap zaten silinmiş." });
            }

            return Ok(new
            {
                message = "Hesabınız başarıyla silinmek üzere işaretlendi. 30 gün içinde tekrar giriş yaparsanız hesabınız otomatik olarak kurtarılacaktır."
            });
        }

        /// <summary>
        /// Sletter brugeren permanent fra databasen (kun SuperAdmin).
        /// DELETE: api/users/{id}
        /// </summary>
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin, SuperAdmin")]
        public async Task<IActionResult> HardDeleteUser(int id)
        {
            int currentUserId = GetCurrentUserIdFromClaims();

            if (id == currentUserId)
            {
                return BadRequest(new { message = "Kendi hesabınızı bu panelden silemezsiniz." });
            }

            try
            {
                bool isDeleted = await _userService.HardDeleteUserAsync(id);
                if (!isDeleted)
                {
                    return NotFound(new { message = "Silinmek istenen kullanıcı bulunamadı." });
                }

                return Ok(new { message = "Kullanıcı veritabanından kalıcı olarak silindi." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "Kullanıcı silinirken bir sunucu hatası oluştu." });
            }
        }
    }
}
