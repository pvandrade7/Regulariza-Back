
import { db } from "../prisma/db.ts";
import { validarStatus } from "../validators/statusValidator.js";
import { validarUuid } from "../validators/empresaValidator.js";

export async function atualizarStatusObrigacao(req, res) {
    try {
        const { id, obrigacaoId } = req.params;
        const { status } = req.body ?? {};

        if (!validarUuid(id)) {
            return res.status(400).json({
                mensagem: "ID da empresa inválido."
            });
        }

        const idObrigacao = Number(obrigacaoId);

        if (!Number.isSafeInteger(idObrigacao) || idObrigacao <= 0) {
            return res.status(400).json({
                mensagem: "ID da obrigação inválido."
            });
        }

        if (!validarStatus(status)) {
            return res.status(400).json({
                mensagem: "Status inválido.",
                statusPermitidos: [
                    "Pendente",
                    "Em andamento",
                    "Concluída"
                ]
            });
        }

        const vinculo = await db.orm.public.EmpresaObrigacoes
            .where({
                empresaId: id,
                obrigacoesId: idObrigacao
            })
            .first();

        if (!vinculo) {
            return res.status(404).json({
                mensagem: "Obrigação não vinculada à empresa."
            });
        }

        await db.orm.public.EmpresaObrigacoes
            .where({
                id: vinculo.id
            })
            .update({
                status
            });

        return res.status(200).json({
            mensagem: "Status atualizado com sucesso.",
            empresaId: id,
            obrigacaoId: idObrigacao,
            status
        });

    } catch (error) {
        console.error("Erro ao atualizar status:", error);

        return res.status(500).json({
            mensagem: "Erro interno ao atualizar o status da obrigação."
        });
    }
}
