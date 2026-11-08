import 'dotenv/config';
export const production = process.env.NODE_ENV === 'production';
export const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s => s.trim()).filter(Boolean);
if (allowedOrigins.some(origin => { try { return new URL(origin).origin !== origin || (production && !origin.startsWith('https://')); } catch { return true; } })) {
    throw new Error('CORS_ORIGINS deve conter origens exatas; produção exige HTTPS.');
}
export const sessionSeconds = Number(process.env.SESSION_TTL_SECONDS || 28800);
if (!Number.isInteger(sessionSeconds) || sessionSeconds < 60 || sessionSeconds > 604800) throw new Error('SESSION_TTL_SECONDS deve estar entre 60 e 604800.');
export const sameSite = process.env.COOKIE_SAME_SITE || 'lax';
if (!['lax', 'strict', 'none'].includes(sameSite) || (sameSite === 'none' && !production)) throw new Error('COOKIE_SAME_SITE inválido; none exige produção/HTTPS.');
export const cookieName = production ? '__Host-regulariza_session' : 'regulariza_session';
export const cookieOptions = { httpOnly: true, secure: production, sameSite, path: '/' };
