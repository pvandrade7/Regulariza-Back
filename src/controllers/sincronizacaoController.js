
import { validarUuid } from "../validators/empresaValidator.js";
import { sincronizarObrigacoes } from "../services/sincronizarObrigacoesService.js";

function validarData(data) {
    if (typeof data !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return false;
    }

    const parsed = new Date(`${data}T00:00:00.000Z`);

    return !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === data;
}

export async function sincronizarObrigacoesController(req, res) {
    try {
        const { id } = req.params;
        const { dataBase } = req.body ?? {};

        console.log("BODY RECEBIDO:", req.body);
        console.log("DATA BASE:", dataBase);
        console.log("TIPO:", typeof dataBase);

        if (!validarUuid(id)) {
            return res.status(400).json({
                mensagem: "ID da empresa inválido."
            });
        }

        if (!validarData(dataBase)) {
            return res.status(400).json({
                mensagem: "Informe dataBase no formato AAAA-MM-DD."
            });
        }

        const resultado = await sincronizarObrigacoes(
            id,
            dataBase
        );

        if (!resultado) {
            return res.status(404).json({
                mensagem: "Empresa não encontrada."
            });
        }

        return res.status(200).json(resultado);

    } catch (error) {
        console.error("Erro na sincronização:", error);

        return res.status(500).json({
            mensagem: "Erro ao sincronizar obrigações."
        });
    }
}
