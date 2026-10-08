import { Router } from "express";

import {
    criarEmpresa,
    listarEmpresas,
    buscarEmpresa,
    atualizarEmpresa,
    excluirEmpresa
} from "../controllers/empresaController.js";

const router = Router();

router.post("/", criarEmpresa);

router.get("/", listarEmpresas);

router.get("/:id", buscarEmpresa);

router.put("/:id", atualizarEmpresa);

router.delete("/:id", excluirEmpresa);

export default router;