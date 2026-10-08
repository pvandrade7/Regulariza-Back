const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validarUuid(id) {
    return typeof id === "string" && uuidRegex.test(id);
}

function somenteNumeros(valor) {
    return valor.replace(/\D/g, "");
}

function validarCPF(cpf) {
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    for (let tamanho = 9; tamanho <= 10; tamanho++) {
        let soma = 0;

        for (let i = 0; i < tamanho; i++) {
            soma += Number(cpf[i]) * (tamanho + 1 - i);
        }

        const resto = (soma * 10) % 11;
        const digito = resto === 10 ? 0 : resto;

        if (digito !== Number(cpf[tamanho])) return false;
    }

    return true;
}

function validarCNPJ(cnpj) {
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    const calcularDigito = (base, pesos) => {
        const soma = pesos.reduce(
            (total, peso, i) => total + Number(base[i]) * peso,
            0
        );

        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };

    const primeiro = calcularDigito(
        cnpj.slice(0, 12),
        [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    );

    const segundo = calcularDigito(
        cnpj.slice(0, 13),
        [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    );

    return (
        primeiro === Number(cnpj[12]) &&
        segundo === Number(cnpj[13])
    );
}

const camposPermitidos = [
    "usuarioId",
    "regimeJuridicoId",
    "nome",
    "cpf",
    "cnpj",
    "atividade",
    "porte",
    "municipio",
    "estado",
    "numeroFuncionarios",
    "estabelecimentoFisico"
];

export function validarEmpresa(body, parcial = false) {
    const erros = [];
    const dados = {};

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return {
            erros: ["Envie um objeto JSON válido."],
            dados
        };
    }

    for (const campo of Object.keys(body)) {
        if (!camposPermitidos.includes(campo)) {
            erros.push(`Campo não permitido: ${campo}`);
        }
    }

    const obrigatorios = [
        "usuarioId",
        "regimeJuridicoId",
        "nome",
        "atividade",
        "municipio",
        "estado"
    ];

    if (!parcial) {
        for (const campo of obrigatorios) {
            if (body[campo] === undefined || body[campo] === null ||
                body[campo] === "") {
                erros.push(`O campo ${campo} é obrigatório.`);
            }
        }
    }

    if (body.usuarioId !== undefined) {
        if (!validarUuid(body.usuarioId)) {
            erros.push("usuarioId deve ser um UUID válido.");
        } else {
            dados.usuarioId = body.usuarioId;
        }
    }

    if (body.regimeJuridicoId !== undefined) {
        if (!Number.isInteger(body.regimeJuridicoId) ||
            body.regimeJuridicoId <= 0) {
            erros.push("regimeJuridicoId deve ser um inteiro positivo.");
        } else {
            dados.regimeJuridicoId = body.regimeJuridicoId;
        }
    }

    const textos = {
        nome: 150,
        atividade: 150,
        municipio: 100,
        estado: 2,
        porte: 50
    };

    for (const [campo, tamanho] of Object.entries(textos)) {
        if (body[campo] === undefined) continue;

        if (campo === "porte" && body[campo] === null) {
            dados.porte = null;
            continue;
        }

        if (
            typeof body[campo] !== "string" ||
            !body[campo].trim() ||
            body[campo].trim().length > tamanho
        ) {
            erros.push(`${campo} deve ser um texto válido de até ${tamanho} caracteres.`);
        } else {
            dados[campo] = body[campo].trim();
        }
    }

    if (dados.estado) {
        dados.estado = dados.estado.toUpperCase();

        if (!/^[A-Z]{2}$/.test(dados.estado)) {
            erros.push("Estado deve conter uma UF válida.");
        }
    }

    for (const campo of ["cpf", "cnpj"]) {
        if (body[campo] === undefined) continue;

        if (body[campo] === null || body[campo] === "") {
            dados[campo] = null;
            continue;
        }

        if (typeof body[campo] !== "string") {
            erros.push(`${campo} deve ser uma string.`);
            continue;
        }

        const numero = somenteNumeros(body[campo]);

        const valido = campo === "cpf"
            ? numero.length === 11 && validarCPF(numero)
            : numero.length === 14 && validarCNPJ(numero);

        if (!valido) {
            erros.push(`${campo.toUpperCase()} inválido.`);
        } else {
            dados[campo] = numero;
        }
    }

    if (body.numeroFuncionarios !== undefined) {
        if (
            !Number.isInteger(body.numeroFuncionarios) ||
            body.numeroFuncionarios < 0
        ) {
            erros.push("numeroFuncionarios deve ser um inteiro não negativo.");
        } else {
            dados.numeroFuncionarios = body.numeroFuncionarios;
        }
    }

    if (body.estabelecimentoFisico !== undefined) {
        if (typeof body.estabelecimentoFisico !== "boolean") {
            erros.push("estabelecimentoFisico deve ser true ou false.");
        } else {
            dados.estabelecimentoFisico = body.estabelecimentoFisico;
        }
    }

    return { erros, dados };
}