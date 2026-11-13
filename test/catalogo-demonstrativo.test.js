import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { executarMotor, avaliarObrigacao } from '../src/services/motorAplicabilidade.js';
const proposta=JSON.parse(readFileSync(new URL('../revisao-catalogo/proposta.json',import.meta.url)));
const catalogo=proposta.depois.map(o=>({...o,criterios:proposta.criteriosObservados.filter(c=>c.obrigacao_id===o.id)}));

test('catálogo observado seleciona somente triagem, sem presumir dever legal',()=>{
  for (const [perfil,ids] of [
    [{regime_juridico_id:1,numero_funcionarios:0},[1]],
    [{regime_juridico_id:1,numero_funcionarios:1},[1,3,4]],
    [{regime_juridico_id:2,numero_funcionarios:0,regime_tributario:'Simples Nacional'},[2,5]],
    [{regime_juridico_id:2,numero_funcionarios:2,regime_tributario:'Lucro Real'},[2,3,4,5]],
    [{},[]]
  ]) {
    assert.deepEqual(executarMotor(perfil,catalogo).filter(o=>o.aplicavel).map(o=>o.id),ids);
  }
  assert.ok(catalogo.every(o=>/triagem/i.test(o.nome)));
});

// Fixture técnica isolada; NÃO representa a regra legal completa e NÃO vai ao banco.
// Recorte de revisão da ECF para PJ em três regimes citados pela Receita Federal.
// Imunes/isentas e exceções (inatividade, órgãos públicos etc.) exigem outros dados.
const ecfTriagem={id:'fixture-ecf',nome:'Recorte de revisão ECF (demonstrativo)',criterios:
  ['Lucro Real','Lucro Presumido','Lucro Arbitrado'].flatMap((regime,i)=>[
    {campo:'regime_juridico_id',operador:'=',valor:'2',grupo:i+1},
    {campo:'regime_tributario',operador:'=',valor:regime,grupo:i+1}
  ])
};
test('AND/OR: cada regime é alternativa, mas PJ é exigido em todos os grupos da fixture',()=>{
  for (const regime of ['Lucro Real','Lucro Presumido','Lucro Arbitrado']) {
    assert.equal(avaliarObrigacao({regime_juridico_id:2,regime_tributario:regime},ecfTriagem).aplicavel,true);
    assert.equal(avaliarObrigacao({regime_juridico_id:1,regime_tributario:regime},ecfTriagem).aplicavel,false);
  }
  for (const regime of [null,undefined,'','Simples Nacional','Não informado'])
    assert.equal(avaliarObrigacao({regime_juridico_id:2,regime_tributario:regime},ecfTriagem).aplicavel,false);
});

test('CNAE, porte e atividade não são usados para fabricar exclusões no catálogo',()=>{
  const base={regime_juridico_id:2,numero_funcionarios:1};
  const resultado=p=>executarMotor(p,catalogo).map(o=>o.aplicavel);
  assert.deepEqual(resultado({...base,cnae_principal:'6201501',porte:'ME',atividade:'Software'}),resultado(base));
});
