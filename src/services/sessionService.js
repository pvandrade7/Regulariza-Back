import { randomBytes, createHash, createHmac } from 'node:crypto';
import { pool } from '../database/pool.js';
import { cookieName, cookieOptions, sessionSeconds } from '../config/auth.js';
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export const csrfToken = token => createHmac('sha256', token).update('regulariza-csrf-v1').digest('hex');
export function readSessionToken(req) {
    const cookies = String(req.headers.cookie || '').split(';').map(s => s.trim());
    const values = cookies.filter(s => s.startsWith(`${cookieName}=`));
    if (values.length !== 1) return null;
    const token = values[0].slice(cookieName.length + 1);
    return /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export function clearSessionCookie(res) { res.clearCookie(cookieName, cookieOptions); }
export async function createSession(req, res, usuario) {
    const token = randomBytes(32).toString('hex');
    const old = readSessionToken(req);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (old) await client.query('DELETE FROM auth_sessoes WHERE token_hash = $1', [tokenHash(old)]);
        await client.query('INSERT INTO auth_sessoes (token_hash, usuario_id, expira_em) VALUES ($1, $2, now() + $3 * interval \'1 second\')', [tokenHash(token), usuario.id, sessionSeconds]);
        await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: sessionSeconds * 1000 });
    return { usuario, csrfToken: csrfToken(token) };
}
