const CAMPOS_PERMITIDOS = {
    regime_juridico_id: "number",
    numero_funcionarios: "number",
    estabelecimento_fisico: "boolean",
    estado: "string",
    municipio: "string",
    porte: "string",
    atividade: "string"
};

const OPERADORES = new Set(["=", "!=", ">", "<", ">=", "<="]);

function converterValor(valor, tipo) {
    if (tipo === "number") {
        if (valor === null || valor === undefined || valor === "") {
            throw new Error("Valor numérico inválido.");
        }

        const numero = Number(valor);

        if (!Number.isFinite(numero)) {
            throw new Error("Valor numérico inválido.");
        }

        return numero;
    }

    if (tipo === "boolean") {
        if (valor === true || valor === "true") return true;
        if (valor === false || valor === "false") return false;

        throw new Error("Valor booleano inválido.");
    }

    if (tipo === "string") {
        if (typeof valor !== "string") {
            throw new Error("Valor textual inválido.");
        }

        return valor.trim().toLowerCase();
    }

    throw new Error("Tipo de campo desconhecido.");
}

export function avaliarCriterio(empresa, criterio) {
    const { campo, operador, valor } = criterio;

    const tipo = CAMPOS_PERMITIDOS[campo];

    if (!tipo) {
        throw new Error(`Campo não permitido: ${campo}`);
    }

    if (!OPERADORES.has(operador)) {
        throw new Error(`Operador não permitido: ${operador}`);
    }

    if (tipo !== "number" && !["=", "!="].includes(operador)) {
        throw new Error(
            `Operador ${operador} incompatível com o campo ${campo}.`
        );
    }

    const valorEmpresa = empresa[campo];

    if (valorEmpresa === null || valorEmpresa === undefined) {
        return false;
    }

    const atual = converterValor(valorEmpresa, tipo);
    const esperado = converterValor(valor, tipo);

    switch (operador) {
        case "=":
            return atual === esperado;

        case "!=":
            return atual !== esperado;

        case ">":
            return atual > esperado;

        case "<":
            return atual < esperado;

        case ">=":
            return atual >= esperado;

        case "<=":
            return atual <= esperado;
    }
}

export function avaliarObrigacao(empresa, obrigacao) {
    const criterios = obrigacao.criterios ?? [];

    if (criterios.length === 0) {
        return {
            id: obrigacao.id,
            nome: obrigacao.nome,
            aplicavel: false,
            motivo: "Obrigação sem critérios cadastrados.",
            criteriosAvaliados: []
        };
    }

    const criteriosAvaliados = criterios.map((criterio) => {
        const atendido = avaliarCriterio(empresa, criterio);

        return {
            campo: criterio.campo,
            operador: criterio.operador,
            valorEsperado: criterio.valor,
            valorEmpresa: empresa[criterio.campo] ?? null,
            atendido
        };
    });

    const aplicavel = criteriosAvaliados.every(
        (criterio) => criterio.atendido
    );

    return {
        id: obrigacao.id,
        nome: obrigacao.nome,
        aplicavel,
        motivo: aplicavel
            ? "Todos os critérios foram atendidos."
            : "Um ou mais critérios não foram atendidos.",
        criteriosAvaliados
    };
}

export function executarMotor(empresa, obrigacoes) {
    if (!empresa || !Array.isArray(obrigacoes)) {
        throw new Error("Dados inválidos para execução do motor.");
    }

    return obrigacoes.map((obrigacao) =>
        avaliarObrigacao(empresa, obrigacao)
    );
}