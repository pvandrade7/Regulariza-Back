import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

const vinculos = new Map([[2,{status:'Concluída',vencimento:'2026-01-15'}], [3,{status:'Em andamento',vencimento:null}]]);
const catalogo = [1,2,3,4].map(id => ({id,nome:`Teste ${id}`,periodicidade:id === 4 ? 'eventual' : 'mensal', prazo:id === 4 ? null : 'REGRA:DAS_MEI'}));
mock.module('../src/database/pool.js', {namedExports:{pool:{connect:async()=>({
  query:async(sql,params)=>{
    if (sql.includes('SELECT * FROM empresa')) return {rows:[{id:'empresa',cnae_principal:'6201501',regime_tributario:'Simples Nacional'}]};
    if (sql.includes('FROM obrigacoes')) return {rows:catalogo};
    if (sql.includes('FROM criterios')) return {rows:catalogo.flatMap(o=>[
      {obrigacao_id:o.id,campo:'estado',operador:'=',valor:'SP',grupo:1},
      {obrigacao_id:o.id,campo:'cnae_principal',operador:'=',valor:'6201501',grupo:2},
      {obrigacao_id:o.id,campo:'regime_tributario',operador:'=',valor:'Simples Nacional',grupo:2}
    ])};
    if (sql.includes('INSERT INTO empresa_obrigacoes')) {
      if (vinculos.has(params[1])) return {rowCount:0};
      vinculos.set(params[1],{status:'Pendente',vencimento:params[2]});return {rowCount:1};
    }
    if (sql.includes('UPDATE empresa_obrigacoes')) {
      assert.match(sql,/AND vencimento IS NULL/);
      assert.doesNotMatch(sql,/SET status/);
      const atual=vinculos.get(params[1]);
      if (atual.vencimento !== null) return {rowCount:0};
      atual.vencimento=params[2];return {rowCount:1};
    }
    assert.ok(['BEGIN','COMMIT','ROLLBACK'].includes(sql));return {rows:[]};
  },release(){}
})}}});
const {sincronizarObrigacoes}=await import('../src/services/sincronizarObrigacoesService.js');
test('sincronização persiste datas calculáveis, preserva status/datas e não inventa prazo eventual',async()=>{
  const resultado=await sincronizarObrigacoes('empresa',{competencia:'2026-10'},'dono');
  assert.equal(resultado.totalAplicaveis,4);
  assert.equal(resultado.vinculosCriados,2);
  assert.equal(resultado.vencimentosPreenchidos,2);
  assert.deepEqual(vinculos.get(1),{status:'Pendente',vencimento:'2026-11-23'});
  assert.deepEqual(vinculos.get(2),{status:'Concluída',vencimento:'2026-01-15'});
  assert.deepEqual(vinculos.get(3),{status:'Em andamento',vencimento:'2026-11-23'});
  assert.deepEqual(vinculos.get(4),{status:'Pendente',vencimento:null});
  const repeticao=await sincronizarObrigacoes('empresa',{competencia:'2026-11'},'dono');
  assert.equal(repeticao.vinculosCriados,0);
  assert.equal(repeticao.vencimentosPreenchidos,0);
});
