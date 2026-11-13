import { identificarRegra } from "../services/vencimentoService.js";

import { db } from "../prisma/db.ts";
import { executarMotor } from "../services/motorAplicabilidade.js";
import {
    validarFiltros,
    filtrarObrigacoes
} from "../services/filtroObrigacoesService.js";
import { validarUuid } from "../validators/empresaValidator.js";

function prepararPerfil(empresa) {
    return {
        regime_juridico_id: empresa.regimeJuridicoId,
        numero_funcionarios: empresa.numeroFuncionarios,
        estabelecimento_fisico: empresa.estabelecimentoFisico,
        estado: empresa.estado,
        municipio: empresa.municipio,
        porte: empresa.porte,
        atividade: empresa.atividade,
        cnae_principal: empresa.cnaePrincipal,
        regime_tributario: empresa.regimeTributario
    };
}

export async function listarObrigacoesAplicaveis(req, res) {
    try {
        const { id } = req.params;

        if (!validarUuid(id)) {
            return res.status(400).json({
                mensagem: "ID da empresa inválido."
            });
        }

        const { erros, filtros } = validarFiltros(req.query);

        if (erros.length > 0) {
            return res.status(400).json({ erros });
        }

        const empresa = await db.orm.public.Empresa
            .where({ id, usuarioId: req.usuario.id })
            .first();

        if (!empresa) {
            return res.status(404).json({
                mensagem: "Empresa não encontrada."
            });
        }

        const [obrigacoes, vinculos] = await Promise.all([
            db.orm.public.Obrigacoes
                .include("criterios")
                .all(),

            db.orm.public.EmpresaObrigacoes
                .where({ empresaId: id })
                .all()
        ]);

        const vinculosPorObrigacao = new Map(
            vinculos.map((vinculo) => [
                vinculo.obrigacoesId,
                vinculo
            ])
        );

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
                valor: criterio.valor,
                grupo: criterio.grupo
            }))
        }));

        const resultados = executarMotor(
            prepararPerfil(empresa),
            obrigacoesPreparadas
        );

        const detalhesPorId = new Map(
            obrigacoesPreparadas.map((obrigacao) => [
                obrigacao.id,
                obrigacao
            ])
        );

        const aplicaveis = resultados
            .filter((resultado) => resultado.aplicavel && vinculosPorObrigacao.has(resultado.id))
            .map((resultado) => {
                const detalhes = detalhesPorId.get(resultado.id);
                const vinculo = vinculosPorObrigacao.get(resultado.id);

                return {
                    ...resultado,
                    descricao: detalhes.descricao,
                    categoria: detalhes.categoria,
                    periodicidade: detalhes.periodicidade,
                    prazo: detalhes.prazo,
                    orgaoRelacionado: detalhes.orgaoRelacionado,
                    status: vinculo.status,
                    vencimento: vinculo?.vencimento ?? null,
                    regraVencimento: identificarRegra(detalhes),
                    vencimentoTipo: vinculo?.vencimento ? "persistido" : "nao_calculavel",
                    vencimentoAviso: vinculo?.vencimento
                        ? "Data cadastrada e preservada; origem e competência não registradas no vínculo. Confirme na guia oficial."
                        : "Sem prazo calculado. Informe o período fiscal e confira se há regra implementada."
                };
            });

        const obrigacoesFiltradas = filtrarObrigacoes(
            aplicaveis,
            filtros
        );

        return res.status(200).json({
            empresa: {
                id: empresa.id,
                nome: empresa.nome
            },
            filtrosAplicados: filtros,
            total: obrigacoesFiltradas.length,
            obrigacoes: obrigacoesFiltradas
        });

    } catch (error) {
        console.error("Erro ao listar obrigações:", error.code || error.name);

        return res.status(500).json({
            mensagem: "Erro ao consultar obrigações aplicáveis."
        });
    }
}
