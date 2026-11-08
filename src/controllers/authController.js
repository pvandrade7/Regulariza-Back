import { pool } from '../database/pool.js';
import { validarCredenciais } from '../validators/authValidator.js';
import { hashPassword, verifyPassword } from '../services/passwordService.js';
import { createSession, clearSessionCookie } from '../services/sessionService.js';
const invalid = res => res.status(401).json({ mensagem: 'E-mail ou senha inválidos.' });
export async function register(req, res) {
    const { erros, dados } = validarCredenciais(req.body, true);
    if (erros.length) return res.status(400).json({ erros });
    const hash = await hashPassword(dados.senha);
    try {
        const result = await pool.query('INSERT INTO usuario (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, nome, email', [dados.nome, dados.email, hash]);
        return res.status(201).json({ usuario: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') return res.status(409).json({ mensagem: 'Não foi possível cadastrar este e-mail. Use o login ou procure suporte.' });
        throw error;
    }
}
export async function login(req, res) {
    const { erros, dados } = validarCredenciais(req.body);
    if (erros.length) return invalid(res);
    const { rows } = await pool.query('SELECT id, nome, email, senha_hash FROM usuario WHERE lower(btrim(email)) = $1', [dados.email]);
    const usuario = rows[0];
    if (!await verifyPassword(usuario?.senha_hash, dados.senha)) return invalid(res);
    const publico = { id: usuario.id, nome: usuario.nome, email: usuario.email };
    return res.json(await createSession(req, res, publico));
}
export function me(req, res) { res.json({ usuario: req.usuario, csrfToken: req.csrfToken }); }
export async function logout(req, res) {
    await pool.query('DELETE FROM auth_sessoes WHERE token_hash = $1', [req.sessionHash]);
    clearSessionCookie(res);
    res.sendStatus(204);
}
