import { test, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { validarEmpresa } from '../src/validators/empresaValidator.js';
import { calcularVencimento } from '../src/services/vencimentoService.js';
import { executarMotor } from '../src/services/motorAplicabilidade.js';
import { validarFiltros, filtrarObrigacoes } from '../src/services/filtroObrigacoesService.js';

const empresaId = '55555555-5555-4555-8555-555555555555';
const usuarioId = '11111111-1111-4111-8111-111111111111';
const dados = { usuarioId, regimeJuridicoId: 2, nome: 'Empresa teste', cnpj: '11222333000181', cpf: null, atividade: 'Serviços', municipio: 'Fortaleza', estado: 'CE', porte: null, numeroFuncionarios: 0, estabelecimentoFisico: false };
let empresa;
let vinculo = { id: 1, empresaId, obrigacoesId: 1, status: 'Pendente', vencimento: '2026-11-30' };
const obrigacoes = [{ id: 1, nome: 'Obrigação teste', categoria: 'Teste', criterios: [{ campo: 'estado', operador: '=', valor: 'CE' }] }, { id: 2, nome: 'Sem vínculo', categoria: 'Teste', criterios: [{ campo: 'estado', operador: '=', valor: 'CE' }] }];
// Estes testes mantêm o contrato regulatório isolado. Segurança real é testada
// em postgres.integration.mjs, sem substituir sessão/CSRF/banco.
mock.module('../src/middlewares/auth.js', { namedExports: {
  requireAuth: (req, _res, next) => { req.usuario = { id: usuarioId }; next(); },
  requireCsrf: (_req, _res, next) => next()
} });
// As dependências são substituídas antes de importar o app: nenhuma operação alcança o banco.
mock.module('../src/prisma/db.ts', { namedExports: { db: { orm: { public: {
  Empresa: { where: ({id, usuarioId: u}) => ({ first: async () => id === empresa?.id ? empresa : null, all: async () => u === usuarioId && empresa ? [empresa] : [] }) },
  Usuario: { where: ({id}) => ({ first: async () => id === usuarioId ? { id } : null }) },
  RegimeJuridico: { all: async () => [{id: 1, nome:'Pessoa Física'}, {id:2, nome:'Pessoa Jurídica'}] },
  Obrigacoes: { include: () => ({ all: async () => obrigacoes }) },
  EmpresaObrigacoes: { where: (where) => ({
    all: async () => where.empresaId === empresaId ? [vinculo] : [],
    first: async () => where.empresaId === empresaId && where.obrigacoesId === 1 ? vinculo : null,
    update: async (values) => { assert.equal(where.id, 1); vinculo = {...vinculo, ...values}; }
  }) }
} } } } });
const queries = [];
mock.module('../src/database/pool.js', { namedExports: { pool: {
  query: async (sql, params) => {
    queries.push({sql,params});
    if (sql.startsWith('INSERT INTO auth_tentativas')) return { rows: [{quantidade:1, espera:900}] };
    if (sql.startsWith('SELECT nome FROM regime_juridico')) return { rows: params[0] === 2 ? [{nome:'Pessoa Jurídica'}] : [{nome:'Pessoa Física'}] };
    if (sql.startsWith('INSERT INTO empresa')) {
      if (empresa) throw Object.assign(new Error('duplicate'), {code:'23505'});
      empresa = {...dados, id:empresaId}; return {rows:[{id:empresaId}], rowCount:1};
    }
    if (sql.startsWith('UPDATE empresa')) {
      empresa = {...empresa, nome:'Empresa editada'}; return {rows:[{id:empresaId}], rowCount:1};
    }
    if (sql.startsWith('INSERT INTO usuario')) return {rows:[{id:usuarioId, nome:params[0], email:params[1]}]};
    throw new Error(`Consulta inesperada: ${sql}`);
  },
  connect: async () => { throw new Error('Banco indisponível para teste de erro'); }
} } });
const { app } = await import('../src/app.js');
let server, base;
before(async () => { server = app.listen(0, '127.0.0.1'); await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); }); base = `http://127.0.0.1:${server.address().port}`; });
after(() => new Promise(r => server.close(r)));
async function request(path, method='GET', body) {
  const res = await fetch(base+path, {method, headers:{'Content-Type':'application/json',Origin:'http://localhost:5173'}, body:body === undefined ? undefined : JSON.stringify(path.startsWith('/empresas') ? Object.fromEntries(Object.entries(body).filter(([key])=>key!=='usuarioId')) : body)});
  return {status:res.status, body:await res.json()};
}
test('health e JSON 404', async () => {
  assert.equal((await request('/health')).status,200);
  assert.equal((await request('/inexistente')).status,404);
});
test('CORS permite Vite, preflight e bloqueia origem desconhecida', async () => {
  const res = await fetch(base+'/empresas', {method:'OPTIONS',headers:{Origin:'http://localhost:5173','Access-Control-Request-Method':'POST'}});
  assert.equal(res.status,204); assert.equal(res.headers.get('access-control-allow-origin'),'http://localhost:5173');
  assert.equal((await fetch(base+'/health',{headers:{Origin:'https://invalida.example'}})).status,403);
});
test('JSON malformado e cadastro inválido retornam 400 sem escrita', async () => {
  assert.equal((await fetch(base+'/empresas',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:5173'},body:'{'})).status,400);
  assert.equal((await request('/empresas','POST',{})).status,400);
  assert.equal(queries.length,0);
});
test('validação PF, PJ, porte opcional e limites', () => {
  assert.deepEqual(validarEmpresa(dados).erros,[]);
  assert.deepEqual(validarEmpresa({...dados, cnpj:null, cpf:'52998224725', regimeJuridicoId:1}).erros,[]);
  for (const extra of [{cpf:'52998224725'},{cnpj:null},{estado:'ZZ'},{numeroFuncionarios:2147483648},{campo:'indevido'}]) assert.ok(validarEmpresa({...dados,...extra}).erros.length);
});
test('regime incompatível não permite escrita', async () => assert.equal((await request('/empresas','POST',{...dados,regimeJuridicoId:1})).status,400));
test('cadastro retorna 201 e UUID, usa parâmetros SQL e consulta retorna registro', async () => {
  const res = await request('/empresas','POST',dados);
  assert.equal(res.status,201); assert.equal(res.body.id,empresaId);
  const insert = queries.find(q=>q.sql.startsWith('INSERT INTO empresa'));
  assert.ok(insert.sql.includes('usuario_id')); assert.ok(!insert.sql.includes(dados.nome)); assert.ok(insert.params.includes(dados.nome));
  assert.equal((await request(`/empresas/${empresaId}`)).body.nome,dados.nome);
});
test('duplicidade retorna 409', async () => assert.equal((await request('/empresas','POST',dados)).status,409));
test('edição não cadastra outra empresa', async () => {
  assert.equal((await request(`/empresas/${empresaId}`,'PATCH',{...dados,nome:'Empresa editada'})).status,200);
  assert.equal((await request(`/empresas/${empresaId}`)).body.nome,'Empresa editada');
  assert.ok(queries.some(q=>q.sql.startsWith('UPDATE empresa')));
});
test('obrigações retornam somente vínculos reais e atualizam status', async () => {
  const url = `/empresas/${empresaId}/obrigacoes`;
  const lista = await request(url); assert.equal(lista.body.total,1); assert.equal(lista.body.obrigacoes[0].status,'Pendente');
  assert.equal((await request(url+'/1/status','PATCH',{status:'concluida'})).status,400);
  assert.equal((await request(url+'/1/status','PATCH',{status:'Concluída'})).status,200);
  assert.equal((await request(url)).body.obrigacoes[0].status,'Concluída');
  assert.equal((await request(url+'/2/status','PATCH',{status:'Pendente'})).status,404);
  assert.equal((await request(url+'?status=Conclu%C3%ADda')).body.total,1);
});
test('IDs inválidos, empresa ausente, filtros e sincronização inválida', async () => {
  assert.equal((await request('/empresas/invalido/obrigacoes')).status,400);
  assert.equal((await request(`/empresas/${usuarioId}/obrigacoes`)).status,404);
  assert.equal((await request(`/empresas/${empresaId}/obrigacoes?status=alien`)).status,400);
  assert.equal((await request(`/empresas/${empresaId}/obrigacoes/sincronizar`,'POST',{dataBase:'2026-02-30'})).status,400);
});
test('documentos e autenticação não fingem suporte', async () => {
  assert.equal((await request(`/empresas/${empresaId}/documentos`)).status,404);
  assert.equal((await request('/login','POST',{})).status,404);
  assert.equal((await request('/health')).body.autenticacao,true);
});
test('cadastro de usuário com senha e seleção de empresas', async () => {
  const res = await request('/usuarios','POST',{nome:'Teste',email:'TESTE@example.com',senha:'Somente-para-teste-2026'});
  assert.equal(res.status,201); assert.equal(res.body.usuario.email,'teste@example.com'); assert.equal(res.body.token,undefined);
  assert.equal((await request(`/usuarios/${usuarioId}/empresas`)).body.length,1);
});
test('motor, filtros e vencimento em fim de mês', () => {
  assert.equal(calcularVencimento('2024-01-31','mensal'),'2024-02-29');
  assert.equal(calcularVencimento('2024-02-29','anual'),'2025-02-28');
  assert.equal(executarMotor({estado:'CE'},obrigacoes)[0].aplicavel,true);
  assert.ok(validarFiltros({vencimentoInicio:'2026-12-01',vencimentoFim:'2026-01-01'}).erros.length);
  assert.equal(filtrarObrigacoes([{status:'Concluída'}],{status:'concluida'}).length,1);
});
