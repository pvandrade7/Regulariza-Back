
import { perguntarGemini } from "../services/geminiService.js";

export async function perguntarAssistente(req, res) {
  const { mensagem } = req.body ?? {};

  if (
    typeof mensagem !== "string" ||
    !mensagem.trim() ||
    mensagem.trim().length > 1000
  ) {
    return res.status(400).json({
      mensagem: "A pergunta deve conter entre 1 e 1000 caracteres.",
    });
  }

  try {
    const resposta = await perguntarGemini(mensagem.trim());

    return res.status(200).json({ resposta });
  } catch (error) {
    console.error("Falha no assistente:", error.name);

    return res.status(503).json({
      mensagem: "O assistente está temporariamente indisponível. Tente novamente.",
    });
  }
}
