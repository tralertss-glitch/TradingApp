using Microsoft.AspNetCore.Mvc;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;

namespace TradingApp.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    // Opretter en ny bruger efter validering af de indsendte oplysninger.
    public async Task<IActionResult> Register([FromBody] RegisterDto request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            var result = await _authService.RegisterAsync(request);
            return result == null
                ? BadRequest(new { message = "Kayıt işlemi gerçekleştirilemedi." })
                : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch
        {
            return StatusCode(500, new { message = "Kayıt sırasında beklenmeyen bir sunucu hatası oluştu." });
        }
    }

    [HttpPost("login")]
    // Validerer loginoplysninger og opretter et token for en gyldig bruger.
    public async Task<IActionResult> Login([FromBody] LoginDto request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            var result = await _authService.LoginAsync(request);
            return result == null
                ? Unauthorized(new { message = "Geçersiz kullanıcı adı/e-posta veya şifre." })
                : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("forgot-password")]
    // Behandler forgot password.
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto request, CancellationToken cancellationToken)
    {
        await _authService.RequestPasswordResetAsync(request, cancellationToken);

        // Vi afslører ikke, om kontoen findes.
        return Ok(new
        {
            message = "Bu bilgilerle eşleşen bir hesap varsa şifre sıfırlama bağlantısı gönderildi."
        });
    }

    [HttpPost("reset-password")]
    // Validerer reset-tokenet og gemmer brugerens nye password.
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto request, CancellationToken cancellationToken)
    {
        var success = await _authService.ResetPasswordAsync(request, cancellationToken);
        if (!success)
        {
            return BadRequest(new
            {
                message = "Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş. Lütfen yeni bir bağlantı isteyin."
            });
        }

        return Ok(new { message = "Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz." });
    }
}
