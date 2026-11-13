
import { GoogleGenAI } from "@google/genai";

const MODELO = "gemini-3.1-flash-lite";

export async function perguntarGemini(mensagem) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const resposta = await ai.models.generateContent({
    model: MODELO,
    contents: mensagem,
    config: {
      systemInstruction: `
Você é o assistente virtual do Regulariza,
uma plataforma brasileira de apoio à regularização
e ao acompanhamento de obrigações empresariais.

Responda em português brasileiro, com clareza e objetividade.

Ajude com dúvidas sobre MEI, DAS, DASN-SIMEI,
CNPJ, regimes tributários e obrigações empresariais.

Não invente leis, prazos, valores ou exigências.
Quando uma informação depender do município,
estado, atividade ou situação específica da empresa,
explique que é necessária uma verificação atualizada.

Não afirme ter consultado dados da empresa,
documentos ou órgãos públicos quando isso não ocorreu.
      `.trim(),
      temperature: 0.3,
      maxOutputTokens: 1024,
      httpOptions: {
        timeout: 20000,
      },
    },
  });

  const texto = resposta.text?.trim();

  if (!texto) {
    throw new Error("O Gemini não retornou uma resposta válida.");
  }

  return texto;
}
