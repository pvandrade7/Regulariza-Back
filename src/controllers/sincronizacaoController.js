import { validarContextoFiscal } from "../services/vencimentoService.js";

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
        const { dataBase, competencia, anoCalendario, situacaoEspecial } = req.body ?? {};
        const contexto = { competencia, anoCalendario, situacaoEspecial };


        if (!validarUuid(id)) {
            return res.status(400).json({
                mensagem: "ID da empresa inválido."
            });
        }

        if ((dataBase !== undefined && !validarData(dataBase)) || validarContextoFiscal(contexto).length ||
            (dataBase === undefined && competencia === undefined && anoCalendario === undefined)) {
            return res.status(400).json({
                mensagem: "Informe competência AAAA-MM e/ou anoCalendario inteiro. dataBase legada, se enviada, deve ser AAAA-MM-DD e não calcula prazos fiscais."
            });
        }

        const resultado = await sincronizarObrigacoes(
            id,
            contexto,
            req.usuario.id
        );

        if (!resultado) {
            return res.status(404).json({
                mensagem: "Empresa não encontrada."
            });
        }

        return res.status(200).json(resultado);

    } catch (error) {
        console.error("Erro na sincronização:", error.code || error.name);

        return res.status(500).json({
            mensagem: "Erro ao sincronizar obrigações."
        });
    }
}
