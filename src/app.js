import "dotenv/config";
import express from "express";
import empresaRoutes from "./routes/empresaRoutes.js";
import { db } from "./prisma/db.ts";
import { pool } from "./database/pool.js";
import { validarUuid } from "./validators/empresaValidator.js";
import authRoutes from './routes/authRoutes.js';
import { requireAuth, requireCsrf } from './middlewares/auth.js';
import { register } from './controllers/authController.js';
import { authRateLimit } from './middlewares/authRateLimit.js';
import { allowedOrigins } from './config/auth.js';

export const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY.split(',').map(s => s.trim()));
app.use((req, res, next) => {
    res.vary("Origin");
    res.set('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !allowedOrigins.includes(req.headers.origin)) {
        return res.status(403).json({ mensagem: 'Origem da requisição inválida.' });
    }
    if (req.headers.origin) {
        if (!allowedOrigins.includes(req.headers.origin)) return res.status(403).json({ mensagem: "Origem não permitida." });
        res.set("Access-Control-Allow-Origin", req.headers.origin);
        res.set("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type,X-CSRF-Token");
        res.set("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !req.is('application/json')) {
        return res.status(415).json({ mensagem: 'Envie Content-Type application/json.' });
    }
    next();
});
app.use(express.json({ limit: "100kb" }));
app.get("/health", (_req, res) => res.json({ status: "ok", autenticacao: true }));
app.get("/regimes-juridicos", async (_req, res) => res.json(await db.orm.public.RegimeJuridico.all()));
app.use('/auth', authRoutes);
// Compatibilidade: este caminho agora exige senha e usa o mesmo cadastro seguro.
app.post('/usuarios', authRateLimit('register', 10), register);
app.get('/usuarios/:id/empresas', requireAuth, async (req, res) => {
    if (!validarUuid(req.params.id)) return res.status(400).json({ mensagem: 'Identificador inválido.' });
    if (req.params.id !== req.usuario.id) return res.status(403).json({ mensagem: 'Acesso não permitido.' });
    res.json(await db.orm.public.Empresa.where({ usuarioId: req.usuario.id }).all());
});
app.use('/empresas', requireAuth, requireCsrf, empresaRoutes);
app.use((_req, res) => res.status(404).json({ mensagem: "Rota não encontrada." }));
app.use((error, _req, res, _next) => {
    if (error.type === "entity.parse.failed") return res.status(400).json({ mensagem: "JSON inválido." });
    if (error.type === "entity.too.large") return res.status(413).json({ mensagem: "Requisição muito grande." });
    if (error.code === "23505") return res.status(409).json({ mensagem: "CPF, CNPJ ou e-mail já cadastrado." });
    if (error.code === "23503") return res.status(400).json({ mensagem: "Usuário ou regime jurídico inexistente." });
    console.error("Falha na API:", error.code || error.name);
    res.status(503).json({ mensagem: "Não foi possível acessar os dados. Verifique a disponibilidade do banco e tente novamente." });
});
