
import { pool } from "../database/pool.js";
import { executarMotor } from "./motorAplicabilidade.js";
import { obterVencimentoObrigacao } from "./vencimentoService.js";

function prepararPerfil(empresa) {
    return {
        regime_juridico_id: empresa.regime_juridico_id,
        numero_funcionarios: empresa.numero_funcionarios,
        estabelecimento_fisico: empresa.estabelecimento_fisico,
        estado: empresa.estado,
        municipio: empresa.municipio,
        porte: empresa.porte,
        atividade: empresa.atividade,
        cnae_principal: empresa.cnae_principal,
        regime_tributario: empresa.regime_tributario
    };
}

export async function sincronizarObrigacoes(empresaId, dataBase, usuarioId) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Impede sincronizações simultâneas da mesma empresa.
        const empresaResult = await client.query(
            "SELECT * FROM empresa WHERE id = $1 AND usuario_id = $2 FOR UPDATE",
            [empresaId, usuarioId]
        );

        const empresa = empresaResult.rows[0];

        if (!empresa) {
            await client.query("ROLLBACK");
            return null;
        }

        const obrigacoesResult = await client.query(`
            SELECT id, nome, descricao, categoria,
                   periodicidade, prazo, orgao_relacionado
            FROM obrigacoes
            ORDER BY id
        `);

        const criteriosResult = await client.query(`
            SELECT id, obrigacao_id, campo, operador, valor, grupo
            FROM criterios
            ORDER BY id
        `);

        const obrigacoes = obrigacoesResult.rows.map((obrigacao) => ({
            ...obrigacao,
            criterios: criteriosResult.rows
                .filter((criterio) =>
                    criterio.obrigacao_id === obrigacao.id
                )
        }));

        const resultados = executarMotor(
            prepararPerfil(empresa),
            obrigacoes
        );

        const aplicaveis = resultados.filter(
            (resultado) => resultado.aplicavel
        );

        const obrigacoesPorId = new Map(
            obrigacoes.map((obrigacao) => [
                obrigacao.id,
                obrigacao
            ])
        );

        let criadas = 0;
        let vencimentosPreenchidos = 0;
        const calculos = [];

        for (const resultado of aplicaveis) {
            const obrigacao = obrigacoesPorId.get(resultado.id);

            const calculo = obterVencimentoObrigacao(
                obrigacao,
                dataBase,
                empresa
            );

            calculos.push({ obrigacaoId: obrigacao.id, ...calculo });

            const vencimento = calculo.calculado
                ? calculo.vencimento
                : null;

            // Insere apenas se o vínculo ainda não existir.
            const insercao = await client.query(`
                INSERT INTO empresa_obrigacoes
                    (empresa_id, obrigacoes_id, status, vencimento)
                VALUES ($1, $2, 'Pendente', $3)
                ON CONFLICT (empresa_id, obrigacoes_id)
                DO NOTHING
                RETURNING id
            `, [empresaId, obrigacao.id, vencimento]);

            if (insercao.rowCount > 0) {
                criadas++;
                if (vencimento !== null) {
                    vencimentosPreenchidos++;
                }
                continue;
            }

            // Não altera vencimentos já preenchidos.
            if (vencimento !== null) {
                const atualizacao = await client.query(`
                    UPDATE empresa_obrigacoes
                    SET vencimento = $3
                    WHERE empresa_id = $1
                      AND obrigacoes_id = $2
                      AND vencimento IS NULL
                    RETURNING id
                `, [empresaId, obrigacao.id, vencimento]);

                vencimentosPreenchidos += atualizacao.rowCount;
            }
        }

        await client.query("COMMIT");

        return {
            empresa: {
                id: empresa.id,
                nome: empresa.nome
            },
            dataBase,
            totalAplicaveis: aplicaveis.length,
            vinculosCriados: criadas,
            vencimentosPreenchidos,
            calculos,
            aviso: "Vencimentos já preenchidos foram preservados. Um vínculo por obrigação: não é um histórico de competências.",
            mensagem: criteriosResult.rows.length === 0
                ? "Sincronização concluída, mas não há critérios regulatórios cadastrados; nenhuma aplicabilidade pôde ser determinada."
                : aplicaveis.length === 0
                    ? "Sincronização concluída. Nenhuma obrigação aplicável foi identificada pelos critérios cadastrados."
                    : "Sincronização concluída."
        };

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
