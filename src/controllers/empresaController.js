import { db } from "../prisma/db.ts";
import { pool } from "../database/pool.js";
import { validarEmpresa, validarUuid } from "../validators/empresaValidator.js";

const colunas = { usuarioId: "usuario_id", regimeJuridicoId: "regime_juridico_id", numeroFuncionarios: "numero_funcionarios", estabelecimentoFisico: "estabelecimento_fisico" };
async function validarRegime(dados, res) {
    const resultado = await pool.query("SELECT nome FROM regime_juridico WHERE id = $1", [dados.regimeJuridicoId]);
    const nome = resultado.rows[0]?.nome;
    if (!nome || (nome === "Pessoa Física" && !dados.cpf) || (nome === "Pessoa Jurídica" && !dados.cnpj)) {
        res.status(400).json({ mensagem: "Selecione um regime jurídico compatível com o CPF ou CNPJ informado." });
        return false;
    }
    return true;
}

function dadosDaSessao(req) {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return { erros: ['Envie um objeto JSON válido.'] };
    if (Object.hasOwn(req.body, 'usuarioId')) return { erros: ['Não envie usuarioId; a identidade vem da sessão.'] };
    return validarEmpresa({ ...req.body, usuarioId: req.usuario.id });
}
export async function listarEmpresas(req, res) {
    res.json(await db.orm.public.Empresa.where({ usuarioId: req.usuario.id }).all());
}
export async function criarEmpresa(req, res) {
    const { erros, dados } = dadosDaSessao(req);
    if (erros.length) return res.status(400).json({ erros });
    if (!await validarRegime(dados, res)) return;
    const campos = Object.keys(dados);
    // Os nomes de coluna vêm exclusivamente do validador, nunca do cliente.
    const resultado = await pool.query(
        `INSERT INTO empresa (${campos.map(c => colunas[c] || c).join(", ")}) VALUES (${campos.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id`,
        campos.map(c => dados[c])
    );
    return res.status(201).json({ ...dados, id: resultado.rows[0].id });
}

export async function consultarEmpresa(req, res) {
    if (!validarUuid(req.params.id)) return res.status(400).json({ mensagem: "ID da empresa inválido." });
    const empresa = await db.orm.public.Empresa.where({ id: req.params.id, usuarioId: req.usuario.id }).first();
    if (!empresa) return res.status(404).json({ mensagem: "Empresa não encontrada." });
    return res.json(empresa);
}

export async function atualizarEmpresa(req, res) {
    if (!validarUuid(req.params.id)) return res.status(400).json({ mensagem: "ID da empresa inválido." });
    const { erros, dados } = dadosDaSessao(req);
    if (erros.length) return res.status(400).json({ erros });
    if (!await validarRegime(dados, res)) return;
    const campos = Object.keys(dados);
    const resultado = await pool.query(
        `UPDATE empresa SET ${campos.map((c, i) => `${colunas[c] || c} = $${i + 1}`).join(", ")} WHERE id = $${campos.length + 1} AND usuario_id = $${campos.length + 2} RETURNING id`,
        [...campos.map(c => dados[c]), req.params.id, req.usuario.id]
    );
    if (!resultado.rowCount) return res.status(404).json({ mensagem: "Empresa não encontrada." });
    return res.json({ ...dados, id: req.params.id });
}
