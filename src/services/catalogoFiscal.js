// Identificadores estáveis sem alteração de schema; prazo contém a chave da regra.
const pj = { campo: 'regime_juridico_id', operador: '=', valor: '2' };
const criteriosMei = [
  [pj, { campo: 'porte', operador: '=', valor: 'MEI' }],
  [pj, { campo: 'regime_tributario', operador: '=', valor: 'SIMEI' }],
  [pj, { campo: 'regime_tributario', operador: '=', valor: 'MEI' }]
].flatMap((grupo, i) => grupo.map(c => ({ ...c, grupo: i + 1 })));
export const catalogoFiscal = [
  {
    nome: 'DAS-MEI', categoria: 'Tributária', periodicidade: 'Mensal',
    orgao_relacionado: 'Receita Federal / Comitê Gestor do Simples Nacional',
    prazo: 'REGRA:DAS_MEI',
    descricao: 'Recolhimento mensal do MEI optante pelo SIMEI. Dia 20 do mês seguinte à competência, prorrogado para o próximo dia útil bancário. Enquadramento declarado no cadastro; confirmar opção vigente no período e eventuais prorrogações.',
    criterios: criteriosMei
  },
  {
    nome: 'DASN-SIMEI', categoria: 'Tributária', periodicidade: 'Anual',
    orgao_relacionado: 'Receita Federal / Comitê Gestor do Simples Nacional',
    prazo: 'REGRA:DASN_SIMEI',
    descricao: 'Declaração anual de quem foi optante pelo SIMEI no ano-calendário, inclusive sem receita. Situação normal: 31 de maio do ano seguinte. Extinção e prorrogações possuem regras próprias. O cadastro atual não contém histórico de opção.',
    criterios: criteriosMei
  },
  {
    nome: 'DAS do Simples Nacional / PGDAS-D', categoria: 'Tributária', periodicidade: 'Mensal',
    orgao_relacionado: 'Receita Federal / Comitê Gestor do Simples Nacional',
    prazo: 'REGRA:DAS_SIMPLES',
    descricao: 'Apuração e declaração mensal no PGDAS-D para optantes pelo Simples Nacional não enquadrados no SIMEI, inclusive sem receita; pagamento do DAS quando houver tributo devido. Dia 20 do mês seguinte, prorrogado para o próximo dia útil bancário. Confirmar opção vigente no período.',
    criterios: [pj,
      { campo: 'regime_tributario', operador: '=', valor: 'Simples Nacional' },
      { campo: 'porte', operador: '!=', valor: 'MEI' },
      { campo: 'porte', operador: '!=', valor: 'SIMEI' }
    ].map(c => ({ ...c, grupo: 1 }))
  }
];
