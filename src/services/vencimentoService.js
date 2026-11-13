
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

// As funções anteriores permanecem apenas para compatibilidade; a sincronização
// fiscal não calcula mais vencimentos por periodicidade ou data-base.
const FONTES = {
    DAS_MEI: "https://www8.receita.fazenda.gov.br/simplesnacional/arquivos/manual/perguntaomei.pdf",
    DAS_SIMPLES: "https://www.gov.br/pt-br/servicos/declarar-apuracoes-mensais-do-simples-nacional",
    DASN_SIMEI: "https://www8.receita.fazenda.gov.br/simplesnacional/arquivos/manual/perguntaomei.pdf",
    FGTS_MENSAL: "https://www.gov.br/trabalho-e-emprego/pt-br/servicos/empregador/fgtsdigital/perguntas-frequentes"
};

export function identificarRegra(obrigacao) {
    const chave = obrigacao?.prazo?.startsWith("REGRA:") ? obrigacao.prazo.slice(6) : null;
    if (Object.hasOwn(FONTES, chave)) return chave;
    // Nome legado conhecido, sem depender de um ID de outro ambiente.
    if (["Recolhimento do FGTS", "Recolhimento do FGTS (triagem demonstrativa)"].includes(obrigacao?.nome)) return "FGTS_MENSAL";
    return null;
}

function pascoa(ano) {
    const a=ano%19, b=Math.floor(ano/100), c=ano%100;
    const d=Math.floor(b/4), e=b%4, f=Math.floor((b+8)/25);
    const g=Math.floor((b-f+1)/3), h=(19*a+b-d-g+15)%30;
    const i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-h-k)%7;
    const m=Math.floor((a+11*h+22*l)/451);
    const mes=Math.floor((h+l-7*m+114)/31), dia=(h+l-7*m+114)%31+1;
    return new Date(Date.UTC(ano,mes-1,dia));
}

// Calendário bancário nacional: CMN 4.880 e calendário FEBRABAN.
// Não confundir pontos facultativos administrativos com fechamento dos bancos.
export function diaUtilBancario(data) {
    const ano=data.getUTCFullYear();
    const fixos=["01-01","04-21","05-01","09-07","10-12","11-02","11-15","12-25"];
    if (ano>=2024) fixos.push("11-20");
    const feriados=new Set(fixos.map(d=>`${ano}-${d}`));
    for (const deslocamento of [-48,-47,-2,60]) feriados.add(formatarData(adicionarDias(pascoa(ano),deslocamento)));
    return ![0,6].includes(data.getUTCDay()) && !feriados.has(formatarData(data));
}

export function validarContextoFiscal(contexto) {
    if (!contexto || typeof contexto !== "object" || Array.isArray(contexto)) return ["Informe o contexto fiscal."];
    const erros=[];
    if (contexto.competencia !== undefined && (typeof contexto.competencia !== "string" || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(contexto.competencia))) erros.push("Competência deve ser AAAA-MM.");
    if (contexto.anoCalendario !== undefined && (!Number.isInteger(contexto.anoCalendario) || contexto.anoCalendario<2000 || contexto.anoCalendario>2099)) erros.push("Ano-calendário deve ser um inteiro entre 2000 e 2099.");
    if (contexto.situacaoEspecial !== undefined && typeof contexto.situacaoEspecial!=="boolean") erros.push("Situação especial deve ser booleana.");
    return erros;
}

export function obterVencimentoObrigacao(obrigacao, contexto = {}, empresa = {}) {
    const regra=identificarRegra(obrigacao);
    const naoCalculavel=motivo=>({calculado:false,tipo:"nao_calculavel",vencimento:null,regra,motivo,fonte:FONTES[regra]??null});
    if (!regra) return naoCalculavel("Sem regra fiscal implementada; periodicidade não determina prazo legal.");
    if (typeof contexto!=="object" || contexto===null) return naoCalculavel("Informe competência fiscal ou ano-calendário; data-base não é competência.");
    const erros=validarContextoFiscal(contexto);
    if (erros.length) return naoCalculavel(erros.join(" "));
    if (contexto.situacaoEspecial) return naoCalculavel("Situação especial, extinção ou prorrogação: conferir o prazo no órgão responsável.");
    const municipio=(empresa.municipio??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
    const estado=(empresa.estado??"").toUpperCase();
    if (regra!=="FGTS_MENSAL" && ((estado==="RS" && (contexto.competencia?.startsWith("2024") || contexto.anoCalendario===2023)) ||
        (estado==="PR" && municipio==="rio bonito do iguacu" && (contexto.anoCalendario===2025 || /^(2025-(11|12)|2026-0[1-4])$/.test(contexto.competencia??""))))) {
        return naoCalculavel("Localidade/período sujeito a prorrogação especial; consultar calendário oficial específico.");
    }
    let vencimento;
    let referencia;
    if (regra==="DASN_SIMEI") {
        if (contexto.anoCalendario===undefined) return naoCalculavel("Informe o ano-calendário da DASN-SIMEI.");
        referencia=String(contexto.anoCalendario);
        vencimento=interpretarData(`${contexto.anoCalendario+1}-05-31`);
    } else {
        if (!contexto.competencia) return naoCalculavel("Informe a competência mensal (AAAA-MM).");
        if (regra==="FGTS_MENSAL" && contexto.competencia<"2024-03") return naoCalculavel("FGTS anterior a março/2024 possui regra histórica não implementada.");
        if (regra==="FGTS_MENSAL" && (empresa.regime_juridico_id===1 || empresa.regimeJuridicoId===1)) return naoCalculavel("Empregador PF: confirmar categoria e canal de recolhimento antes de aplicar a regra do FGTS Digital.");
        referencia=contexto.competencia;
        const [ano,mes]=contexto.competencia.split("-").map(Number);
        vencimento=new Date(Date.UTC(ano,mes,20));
        const direcao=regra==="FGTS_MENSAL" ? -1 : 1;
        while (!diaUtilBancario(vencimento)) vencimento=adicionarDias(vencimento,direcao);
    }
    if (vencimento.getUTCFullYear()<2024 || vencimento.getUTCFullYear()>2027) return naoCalculavel("Período fora da cobertura das regras verificadas (2024–2027).");
    return {
        calculado:true, tipo:"calculado_regra_geral", vencimento:formatarData(vencimento), regra, referencia,
        fonte:FONTES[regra],
        motivo:regra==="DASN_SIMEI" ? "Situação normal: 31 de maio do ano seguinte, sem deslocamento por fim de semana." :
            regra==="FGTS_MENSAL" ? "FGTS mensal: dia 20 do mês seguinte, antecipado para dia útil bancário nacional." :
            "DAS/PGDAS-D: dia 20 do mês seguinte, prorrogado para dia útil bancário nacional.",
        aviso:"Regra geral, não estimativa por periodicidade. Confirmar enquadramento no período, expediente bancário aplicável e prorrogações específicas na guia oficial."
    };
}
