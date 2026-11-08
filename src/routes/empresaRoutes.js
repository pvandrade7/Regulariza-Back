import { Router } from "express";

import {
    criarEmpresa, consultarEmpresa, atualizarEmpresa, listarEmpresas
} from "../controllers/empresaController.js";

import {
    listarObrigacoesAplicaveis
} from "../controllers/obrigacaoController.js";

import {
    atualizarStatusObrigacao
} from "../controllers/statusObrigacaoController.js";

import {
    sincronizarObrigacoesController
} from "../controllers/sincronizacaoController.js";

import { requireEmpresaOwner } from '../middlewares/empresaOwner.js';
const router = Router();
router.get('/', listarEmpresas);

// Cadastro de empresa
router.post("/", criarEmpresa);
// Protege também subrotas futuras, como documentos.
router.use("/:id", requireEmpresaOwner);
router.get("/:id", consultarEmpresa);
router.patch("/:id", atualizarEmpresa);

// Listagem e filtros de obrigações
router.get("/:id/obrigacoes", listarObrigacoesAplicaveis);

// Atualização do status
router.patch(
    "/:id/obrigacoes/:obrigacaoId/status",
    atualizarStatusObrigacao
);

// Sincronização e cálculo de vencimentos
router.post(
    "/:id/obrigacoes/sincronizar",
    sincronizarObrigacoesController
);

export default router;