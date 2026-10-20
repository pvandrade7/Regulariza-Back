import { db } from "../prisma/db.ts";
import { executarMotor } from "../services/motorAplicabilidade.js";

function prepararPerfil(empresa) {
    return {
        regime_juridico_id: empresa.regimeJuridicoId,
        numero_funcionarios: empresa.numeroFuncionarios,
        estabelecimento_fisico: empresa.estabelecimentoFisico,
        estado: empresa.estado,
        municipio: empresa.municipio,
        porte: empresa.porte,
        atividade: empresa.atividade
    };
}

export async function listarObrigacoesAplicaveis(req, res) {
    try {
        const { id } = req.params;

        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                mensagem: "ID da empresa inválido."
            });
        }

        // Buscar empresa
        const empresa = await db.orm.public.Empresa
            .where({ id })
            .first();

        if (!empresa) {
            return res.status(404).json({
                mensagem: "Empresa não encontrada."
            });
        }

        // Buscar obrigações e seus critérios
        const obrigacoes = await db.orm.public.Obrigacoes
            .include("criterios")
            .all();

        // Adaptar dados para o motor
        const obrigacoesPreparadas = obrigacoes.map((obrigacao) => ({
            id: obrigacao.id,
            nome: obrigacao.nome,
            descricao: obrigacao.descricao,
            categoria: obrigacao.categoria,
            periodicidade: obrigacao.periodicidade,
            prazo: obrigacao.prazo,
            orgaoRelacionado: obrigacao.orgaoRelacionado,
            criterios: obrigacao.criterios.map((criterio) => ({
                campo: criterio.campo,
                operador: criterio.operador,
                valor: criterio.valor
            }))
        }));

        // Executar motor
        const resultados = executarMotor(
            prepararPerfil(empresa),
            obrigacoesPreparadas
        );

        // Retornar somente obrigações aplicáveis
        const aplicaveis = resultados
            .filter((resultado) => resultado.aplicavel)
            .map((resultado) => {
                const obrigacao = obrigacoesPreparadas.find(
                    (item) => item.id === resultado.id
                );

                return {
                    ...resultado,
                    descricao: obrigacao.descricao,
                    categoria: obrigacao.categoria,
                    periodicidade: obrigacao.periodicidade,
                    prazo: obrigacao.prazo,
                    orgaoRelacionado: obrigacao.orgaoRelacionado
                };
            });

        return res.status(200).json({
            empresa: {
                id: empresa.id,
                nome: empresa.nome
            },
            total: aplicaveis.length,
            obrigacoes: aplicaveis
        });

    } catch (error) {
        console.error("Erro ao listar obrigações:", error);

        return res.status(500).json({
            mensagem: "Erro ao consultar obrigações aplicáveis."
        });
    }
}