
const STATUS_PERMITIDOS = [
    "Pendente",
    "Em andamento",
    "Concluída"
];

function normalizarTexto(valor) {
    return String(valor ?? "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function dataValida(valor) {
    if (typeof valor !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return false;
    }

    const data = new Date(`${valor}T00:00:00.000Z`);

    return !Number.isNaN(data.getTime()) &&
        data.toISOString().slice(0, 10) === valor;
}

function formatarData(valor) {
    if (valor === null || valor === undefined) {
        return null;
    }

    if (valor instanceof Date) {
        return valor.toISOString().slice(0, 10);
    }

    if (typeof valor === "string") {
        return valor.slice(0, 10);
    }

    // Suporte ao Temporal.PlainDate utilizado pelo Prisma 8
    if (
        typeof valor === "object" &&
        typeof valor.year === "number" &&
        typeof valor.month === "number" &&
        typeof valor.day === "number"
    ) {
        return [
            String(valor.year).padStart(4, "0"),
            String(valor.month).padStart(2, "0"),
            String(valor.day).padStart(2, "0")
        ].join("-");
    }

    return null;
}

export function validarFiltros(query) {
    const erros = [];
    const filtros = {};

    const permitidos = [
        "status",
        "categoria",
        "vencimentoInicio",
        "vencimentoFim"
    ];

    for (const campo of Object.keys(query)) {
        if (!permitidos.includes(campo)) {
            erros.push(`Filtro não permitido: ${campo}`);
        }
    }

    if (query.status !== undefined) {
        if (
            typeof query.status !== "string" ||
            !STATUS_PERMITIDOS.some(
                (status) =>
                    normalizarTexto(status) === normalizarTexto(query.status)
            )
        ) {
            erros.push("Status de filtro inválido.");
        } else {
            filtros.status = query.status;
        }
    }

    if (query.categoria !== undefined) {
        if (
            typeof query.categoria !== "string" ||
            !query.categoria.trim()
        ) {
            erros.push("Categoria inválida.");
        } else {
            filtros.categoria = query.categoria.trim();
        }
    }

    for (const campo of ["vencimentoInicio", "vencimentoFim"]) {
        if (query[campo] !== undefined) {
            if (!dataValida(query[campo])) {
                erros.push(`${campo} deve ser uma data válida no formato AAAA-MM-DD.`);
            } else {
                filtros[campo] = query[campo];
            }
        }
    }

    if (
        filtros.vencimentoInicio &&
        filtros.vencimentoFim &&
        filtros.vencimentoInicio > filtros.vencimentoFim
    ) {
        erros.push("A data inicial não pode ser posterior à data final.");
    }

    return { erros, filtros };
}

export function filtrarObrigacoes(obrigacoes, filtros = {}) {
    return obrigacoes.filter((obrigacao) => {
        if (
            filtros.status &&
            normalizarTexto(obrigacao.status) !==
                normalizarTexto(filtros.status)
        ) {
            return false;
        }

        if (
            filtros.categoria &&
            normalizarTexto(obrigacao.categoria) !==
                normalizarTexto(filtros.categoria)
        ) {
            return false;
        }

        const vencimento = formatarData(obrigacao.vencimento);

        if (filtros.vencimentoInicio) {
            if (!vencimento || vencimento < filtros.vencimentoInicio) {
                return false;
            }
        }

        if (filtros.vencimentoFim) {
            if (!vencimento || vencimento > filtros.vencimentoFim) {
                return false;
            }
        }

        return true;
    });
}
