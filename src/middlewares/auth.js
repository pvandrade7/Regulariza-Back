import { timingSafeEqual } from 'node:crypto';
import { pool } from '../database/pool.js';
import { readSessionToken, tokenHash, csrfToken, clearSessionCookie } from '../services/sessionService.js';
export async function requireAuth(req, res, next) {
    res.set('Cache-Control', 'no-store');
    const token = readSessionToken(req);
    if (token) {
        const result = await pool.query(`SELECT u.id, u.nome, u.email FROM auth_sessoes s
            JOIN usuario u ON u.id = s.usuario_id
            WHERE s.token_hash = $1 AND s.expira_em > now() AND u.senha_hash IS NOT NULL`, [tokenHash(token)]);
        if (result.rows[0]) {
            req.usuario = result.rows[0];
            req.sessionHash = tokenHash(token);
            req.csrfToken = csrfToken(token);
            return next();
        }
    }
    clearSessionCookie(res);
    return res.status(401).json({ mensagem: 'Sessão ausente ou expirada. Faça login.' });
}
export function requireCsrf(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const supplied = req.get('X-CSRF-Token');
    if (typeof supplied !== 'string' || !/^[a-f0-9]{64}$/.test(supplied) ||
        !req.csrfToken || !timingSafeEqual(Buffer.from(supplied), Buffer.from(req.csrfToken))) {
        return res.status(403).json({ mensagem: 'Validação CSRF falhou. Atualize a página.' });
    }
    next();
}
