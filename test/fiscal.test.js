import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogoFiscal} from '../src/services/catalogoFiscal.js';
import {executarMotor} from '../src/services/motorAplicabilidade.js';
import {obterVencimentoObrigacao, validarContextoFiscal} from '../src/services/vencimentoService.js';
const mei=catalogoFiscal[0], anual=catalogoFiscal[1], simples=catalogoFiscal[2];
const fgts={nome:'Recolhimento do FGTS (triagem demonstrativa)'};
const calcular=(o,c,e={estado:'CE',municipio:'Fortaleza',regime_juridico_id:2})=>obterVencimentoObrigacao(o,c,e);
test('MEI real por porte e SIMEI explícito; Simples Nacional não implica MEI',()=>{
 const selecionadas=p=>executarMotor(p,catalogoFiscal).filter(o=>o.aplicavel).map(o=>o.nome);
 assert.deepEqual(selecionadas({regime_juridico_id:2,porte:'MEI',regime_tributario:null}),['DAS-MEI','DASN-SIMEI']);
 assert.deepEqual(selecionadas({regime_juridico_id:2,porte:'MEI',regime_tributario:'Simples Nacional'}),['DAS-MEI','DASN-SIMEI']);
 assert.deepEqual(selecionadas({regime_juridico_id:2,porte:null,regime_tributario:'SIMEI'}),['DAS-MEI','DASN-SIMEI']);
 assert.deepEqual(selecionadas({regime_juridico_id:2,porte:'Microempresa (ME)',regime_tributario:'Simples Nacional'}),[simples.nome]);
 assert.deepEqual(selecionadas({regime_juridico_id:2,porte:null,regime_tributario:'Simples Nacional'}),[]);
 assert.deepEqual(selecionadas({regime_juridico_id:1,porte:'MEI',regime_tributario:'SIMEI'}),[]);
 assert.deepEqual(selecionadas({regime_juridico_id:2,porte:'Pequena',regime_tributario:'Lucro Real'}),[]);
});
test('DAS prorroga e FGTS antecipa: novembro/2026, domingo, feriados móveis e virada do ano',()=>{
 for(const o of [mei,simples]) {
  assert.equal(calcular(o,{competencia:'2026-10'}).vencimento,'2026-11-23');
  assert.equal(calcular(o,{competencia:'2026-08'}).vencimento,'2026-09-21');
  assert.equal(calcular(o,{competencia:'2026-12'}).vencimento,'2027-01-20');
  assert.equal(calcular(o,{competencia:'2025-03'}).vencimento,'2025-04-22');
 }
 assert.equal(calcular(fgts,{competencia:'2026-10'}).vencimento,'2026-11-19');
 assert.equal(calcular(fgts,{competencia:'2026-08'}).vencimento,'2026-09-18');
 assert.equal(calcular(fgts,{competencia:'2025-03'}).vencimento,'2025-04-17');
});
test('DASN-SIMEI usa ano-calendário, inclusive 31 de maio em domingo',()=>{
 assert.equal(calcular(anual,{anoCalendario:2025}).vencimento,'2026-05-31');
 assert.equal(calcular(anual,{competencia:'2026-10'}).vencimento,null);
 assert.equal(calcular(anual,{anoCalendario:2025,situacaoEspecial:true}).vencimento,null);
 assert.equal(calcular(anual,{anoCalendario:2025},{estado:'PR',municipio:'Rio Bonito do Iguaçu'}).vencimento,null);
});
test('não inventa prazo por data-base, periodicidade, evento ou competência inválida',()=>{
 for (const c of ['2026-10-31',{}, {competencia:'2026-13'}, {competencia:['2026-10']}, {competencia:'2026-10',situacaoEspecial:true}]) assert.equal(calcular(mei,c).vencimento,null);
 assert.equal(calcular({nome:'IRPF',periodicidade:'Anual'},{anoCalendario:2025}).vencimento,null);
 assert.equal(calcular(fgts,{competencia:'2024-02'}).vencimento,null);
 assert.ok(validarContextoFiscal({anoCalendario:'2025'}).length);
});
