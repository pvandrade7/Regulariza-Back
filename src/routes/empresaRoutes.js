import { Router } from "express";

import {
    criarEmpresa
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

const router = Router();

// Cadastro de empresa
router.post("/", criarEmpresa);

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