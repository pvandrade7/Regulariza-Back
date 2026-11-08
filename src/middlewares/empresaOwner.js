import { db } from '../prisma/db.ts';
import { validarUuid } from '../validators/empresaValidator.js';
export async function requireEmpresaOwner(req, res, next) {
    if (!validarUuid(req.params.id)) return res.status(400).json({ mensagem: 'ID da empresa inválido.' });
    const empresa = await db.orm.public.Empresa.where({ id: req.params.id, usuarioId: req.usuario.id }).first();
    if (!empresa) return res.status(404).json({ mensagem: 'Empresa não encontrada.' });
    req.empresa = empresa;
    next();
}
