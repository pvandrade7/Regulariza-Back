import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

let criterios = [];
let liberado = false;
const consultas = [];
mock.module('../src/database/pool.js', { namedExports: { pool: { connect: async () => ({
  query: async (sql, params) => {
    consultas.push(sql);
    if (sql.includes('SELECT * FROM empresa')) {
      assert.match(sql, /usuario_id = \$2 FOR UPDATE/);
      assert.deepEqual(params, ['empresa', 'dono']);
      return {rows:[{id:'empresa', nome:'Teste', numero_funcionarios:0}]};
    }
    if (sql.includes('FROM obrigacoes')) return {rows:[{id:1,nome:'Fixture isolada'}]};
    if (sql.includes('FROM criterios')) return {rows:criterios};
    assert.ok(['BEGIN','COMMIT','ROLLBACK'].includes(sql), 'Não deve criar vínculos sem critérios atendidos');
    return {rows:[]};
  },
  release: () => { liberado = true; },
}) } } });
const { sincronizarObrigacoes } = await import('../src/services/sincronizarObrigacoesService.js');

test('ausência de critérios é informada sem inventar obrigações', async () => {
  const resultado = await sincronizarObrigacoes('empresa','2026-11-08','dono');
  assert.match(resultado.mensagem,/não há critérios regulatórios cadastrados/);
  assert.equal(resultado.totalAplicaveis,0);
  assert.equal(resultado.vinculosCriados,0);
  assert.ok(consultas.includes('COMMIT'));
  assert.ok(liberado);
});

test('critérios existentes não atendidos são diferentes de catálogo sem critérios', async () => {
  criterios = [{obrigacao_id:1,campo:'numero_funcionarios',operador:'>',valor:'0'}];
  const resultado = await sincronizarObrigacoes('empresa','2026-11-08','dono');
  assert.match(resultado.mensagem,/Nenhuma obrigação aplicável/);
  assert.equal(resultado.vinculosCriados,0);
});
