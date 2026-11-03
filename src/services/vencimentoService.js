
const PERIODICIDADES = {
    diaria: "diaria",
    semanal: "semanal",
    mensal: "mensal",
    trimestral: "trimestral",
    semestral: "semestral",
    anual: "anual"
};

function interpretarData(data) {
    if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        throw new Error("A data deve estar no formato AAAA-MM-DD.");
    }

    const [ano, mes, dia] = data.split("-").map(Number);

    const resultado = new Date(Date.UTC(ano, mes - 1, dia));

    if (
        resultado.getUTCFullYear() !== ano ||
        resultado.getUTCMonth() !== mes - 1 ||
        resultado.getUTCDate() !== dia
    ) {
        throw new Error("Data inválida.");
    }

    return resultado;
}

function formatarData(data) {
    return data.toISOString().slice(0, 10);
}

function adicionarDias(data, quantidade) {
    const resultado = new Date(data.getTime());

    resultado.setUTCDate(resultado.getUTCDate() + quantidade);

    return resultado;
}

function adicionarMeses(data, quantidade) {
    const ano = data.getUTCFullYear();
    const mes = data.getUTCMonth();
    const dia = data.getUTCDate();

    const primeiroDia = new Date(Date.UTC(ano, mes + quantidade, 1));

    const ultimoDiaDoMes = new Date(
        Date.UTC(
            primeiroDia.getUTCFullYear(),
            primeiroDia.getUTCMonth() + 1,
            0
        )
    ).getUTCDate();

    primeiroDia.setUTCDate(Math.min(dia, ultimoDiaDoMes));

    return primeiroDia;
}

export function calcularVencimento(dataBase, periodicidade) {
    const data = interpretarData(dataBase);

    if (typeof periodicidade !== "string") {
        throw new Error("Periodicidade inválida.");
    }

    const tipo = periodicidade
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    if (!Object.hasOwn(PERIODICIDADES, tipo)) {
        throw new Error(
            `Periodicidade não suportada: ${periodicidade}`
        );
    }

    let vencimento;

    switch (tipo) {
        case "diaria":
            vencimento = adicionarDias(data, 1);
            break;

        case "semanal":
            vencimento = adicionarDias(data, 7);
            break;

        case "mensal":
            vencimento = adicionarMeses(data, 1);
            break;

        case "trimestral":
            vencimento = adicionarMeses(data, 3);
            break;

        case "semestral":
            vencimento = adicionarMeses(data, 6);
            break;

        case "anual":
            vencimento = adicionarMeses(data, 12);
            break;
    }

    return formatarData(vencimento);
}

export function obterVencimentoObrigacao(obrigacao, dataBase) {
    if (!obrigacao || typeof obrigacao !== "object") {
        throw new Error("Obrigação inválida.");
    }

    if (!obrigacao.periodicidade) {
        return {
            calculado: false,
            vencimento: null,
            motivo: "Obrigação sem periodicidade definida."
        };
    }

    try {
        return {
            calculado: true,
            vencimento: calcularVencimento(
                dataBase,
                obrigacao.periodicidade
            ),
            motivo: "Data calculada para fins demonstrativos."
        };
    } catch (error) {
        return {
            calculado: false,
            vencimento: null,
            motivo: error.message
        };
    }
}
