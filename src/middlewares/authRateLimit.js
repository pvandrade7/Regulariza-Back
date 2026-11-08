import { createHash } from 'node:crypto';
import { pool } from '../database/pool.js';
// Contador atômico compartilhado entre processos, persistido mesmo após reinício.
export function authRateLimit(scope, limit = 15) {
    return async (req, res, next) => {
        const chave = createHash('sha256').update(`${scope}:${req.ip}`).digest('hex');
        const { rows } = await pool.query(`INSERT INTO auth_tentativas (chave, quantidade, reinicia_em)
            VALUES ($1, 1, now() + interval '15 minutes')
            ON CONFLICT (chave) DO UPDATE SET
                quantidade = CASE WHEN auth_tentativas.reinicia_em <= now() THEN 1 ELSE auth_tentativas.quantidade + 1 END,
                reinicia_em = CASE WHEN auth_tentativas.reinicia_em <= now() THEN now() + interval '15 minutes' ELSE auth_tentativas.reinicia_em END
            RETURNING quantidade, ceil(extract(epoch FROM (reinicia_em - now()))) AS espera`, [chave]);
        if (rows[0].quantidade > limit) {
            res.set('Retry-After', String(Math.max(1, Number(rows[0].espera))));
            return res.status(429).json({ mensagem: 'Muitas tentativas. Tente novamente em alguns minutos.' });
        }
        next();
    };
}
