import { Router } from "express";

import {
    criarEmpresa,
    listarEmpresas,
    buscarEmpresa,
    atualizarEmpresa,
    excluirEmpresa
} from "../controllers/empresaController.js";

import {
    listarObrigacoesAplicaveis
} from "../controllers/obrigacaoController.js";

const router = Router();

router.post("/", criarEmpresa);

router.get("/", listarEmpresas);

router.get("/:id/obrigacoes", listarObrigacoesAplicaveis);

router.get("/:id", buscarEmpresa);

router.put("/:id", atualizarEmpresa);

router.delete("/:id", excluirEmpresa);

export default router;