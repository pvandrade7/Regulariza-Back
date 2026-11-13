
import { Router } from "express";
import { perguntarAssistente } from "../controllers/assistenteController.js";

const router = Router();

router.post("/perguntar", perguntarAssistente);

export default router;
