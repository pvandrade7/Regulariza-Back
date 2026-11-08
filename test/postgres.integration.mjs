// Cria um cluster PostgreSQL descartável. Nunca utiliza DATABASE_URL ou banco existente.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import net from 'node:net';
const pasta = mkdtempSync(join(tmpdir(), 'regulariza-pg-test-'));
function run(cmd, args) {
  const result = spawnSync(cmd,args,{encoding:'utf8'});
  if(result.status !== 0) throw new Error(`${cmd}: ${result.stderr || result.error || result.stdout}`);
}
const probe = net.createServer();
await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',resolve);});
const port = probe.address().port;
await new Promise(resolve=>probe.close(resolve));
run('initdb',['-D',join(pasta,'data'),'-A','trust','--encoding=UTF8','--locale=C']);
let started=false, server, pool;
try {
  run('pg_ctl',['-D',join(pasta,'data'),'-l',join(pasta,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port} -k ${pasta}`,'-w','start']);
  started=true;
  process.env.DATABASE_URL=`postgresql://${encodeURIComponent(userInfo().username)}@127.0.0.1:${port}/postgres`;
  process.env.CORS_ORIGINS='http://localhost:5173';
  ({pool}=await import('../src/database/pool.js'));
  await pool.query(readFileSync(new URL('./postgres-fixture.sql',import.meta.url),'utf8'));
  // Conta anterior à migração: UUID e vínculos devem sobreviver sem senha padrão.
  const legacy = (await pool.query("INSERT INTO usuario (nome, email) VALUES ('Legado', 'legado@example.invalid') RETURNING id")).rows[0];
  const legacyEmpresa = (await pool.query("INSERT INTO empresa (usuario_id,regime_juridico_id,nome,atividade,municipio,estado) VALUES ($1,1,'Empresa anterior','Serviços','Fortaleza','CE') RETURNING id", [legacy.id])).rows[0];
  const duplicate=(await pool.query("INSERT INTO usuario (nome,email) VALUES ('Legado duplicado','LEGADO@example.invalid') RETURNING id")).rows[0];
  const stopped=spawnSync(process.execPath,['scripts/migrate-auth.js','--apply'],{encoding:'utf8'});
  assert.equal(stopped.status,1);assert.ok(stopped.stderr.includes('colisões de e-mail'));
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema='public' AND table_name='usuario' AND column_name='senha_hash'")).rows[0].n,0);
  // Resolve exclusivamente a colisão da fixture isolada sem excluir o registro.
  await pool.query("UPDATE usuario SET email='outro-legado@example.invalid' WHERE id=$1",[duplicate.id]);
  run(process.execPath, ['scripts/migrate-auth.js', '--apply']);
  run(process.execPath, ['scripts/migrate-auth.js', '--apply']); // idempotência da migração
  assert.equal((await pool.query('SELECT senha_hash FROM usuario WHERE id=$1',[legacy.id])).rows[0].senha_hash,null);
  assert.equal((await pool.query('SELECT usuario_id FROM empresa WHERE id=$1',[legacyEmpresa.id])).rows[0].usuario_id,legacy.id);
  await pool.query('CREATE ROLE regulariza_browser_test NOLOGIN');
  await pool.query('GRANT USAGE ON SCHEMA public TO regulariza_browser_test');
  await pool.query('GRANT SELECT ON usuario, empresa, empresa_obrigacoes, auth_sessoes TO regulariza_browser_test');
  const restricted=await pool.connect();
  try {
    await restricted.query('SET ROLE regulariza_browser_test');
    for(const table of ['usuario','empresa','empresa_obrigacoes','auth_sessoes']) assert.equal((await restricted.query(`SELECT * FROM ${table}`)).rowCount,0);
  } finally {await restricted.query('RESET ROLE');restricted.release();}
  console.log('PASS migração aditiva/idempotente: IDs e vínculos antigos preservados, sem senha padrão; RLS impede SELECT direto.');
  const {app}=await import('../src/app.js');
  server=app.listen(0,'127.0.0.1');
  await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
  const base=`http://127.0.0.1:${server.address().port}`;
  const a={}, b={}, anon={};
  async function request(actor,path,method='GET',body,expected=200,extra={}) {
    const headers={'Content-Type':'application/json',Origin:'http://localhost:5173',...extra};
    if(actor.cookie) headers.Cookie=actor.cookie;
    if(actor.csrf && !Object.hasOwn(extra,'X-CSRF-Token')) headers['X-CSRF-Token']=actor.csrf;
    const res=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    const data=res.status===204?null:await res.json();
    assert.equal(res.status,expected,`${method} ${path}: ${JSON.stringify(data)}`);
    const cookie=res.headers.get('set-cookie');
    if(cookie) actor.cookie=cookie.split(';')[0];
    if(data?.csrfToken) actor.csrf=data.csrfToken;
    return {data,res,cookie};
  }
  const senha='Uma-senha-de-teste-2026';
  await request(anon,'/auth/register','POST',{nome:' ',email:'invalido',senha:'curta'},400);
  await request(anon,'/auth/register','POST',{nome:'Teste',email:'valido@example.invalid',senha:'curta'},400);
  await request(anon,'/auth/login','POST',{email:'inexistente@example.invalid',senha},401);
  await request(anon,'/auth/login','POST',{email:'legado@example.invalid',senha},401);
  await request(anon,'/auth/register','POST',{nome:'Invasor',email:'LEGADO@example.invalid',senha},409);
  const userA=(await request(anon,'/auth/register','POST',{nome:'Usuário A',email:'  A@EXAMPLE.INVALID  ',senha},201)).data.usuario;
  const userB=(await request(anon,'/auth/register','POST',{nome:'Usuário B',email:'b@example.invalid',senha},201)).data.usuario;
  assert.deepEqual(Object.keys(userA).sort(),['email','id','nome']);assert.equal(userA.email,'a@example.invalid');
  const stored=(await pool.query('SELECT senha_hash FROM usuario WHERE id=$1',[userA.id])).rows[0].senha_hash;
  assert.ok(stored.startsWith('$argon2id$'));assert.notEqual(stored,senha);
  await request(anon,'/auth/register','POST',{nome:'Duplicado',email:'A@example.invalid',senha},409);
  await request(anon,'/usuarios','POST',{nome:'Sem senha',email:'nome@example.invalid'},400);
  const invalid=(await request(anon,'/auth/login','POST',{email:userA.email,senha:'Senha-errada'},401)).data;
  assert.deepEqual(invalid,(await request(anon,'/auth/login','POST',{email:'naoexiste@example.invalid',senha},401)).data);
  await request(anon,'/auth/login','POST',{id:userA.id},401);
  const loginA=await request(a,'/auth/login','POST',{email:userA.email,senha});
  assert.ok(loginA.cookie.includes('HttpOnly'));assert.ok(loginA.cookie.includes('SameSite=Lax'));assert.ok(loginA.cookie.includes('Path=/'));
  assert.equal(loginA.res.headers.get('cache-control'),'no-store');
  assert.equal(loginA.res.headers.get('access-control-allow-credentials'),'true');
  assert.equal(loginA.data.usuario.id,userA.id);assert.equal(loginA.data.usuario.senha_hash,undefined);
  const token=a.cookie.split('=')[1];
  const dbSession=(await pool.query('SELECT token_hash FROM auth_sessoes WHERE usuario_id=$1',[userA.id])).rows[0];
  assert.notEqual(dbSession.token_hash,token);
  const refreshed={cookie:a.cookie};assert.equal((await request(refreshed,'/auth/me')).data.usuario.id,userA.id);assert.ok(refreshed.csrf);
  await request(b,'/auth/login','POST',{email:userB.email,senha});
  await request(anon,'/auth/me','GET',undefined,401);
  await request(anon,'/empresas','GET',undefined,401);
  await request(anon,`/usuarios/${userA.id}/empresas`,'GET',undefined,401);
  await request(b,`/usuarios/${userA.id}/empresas`,'GET',undefined,403);
  const dados={regimeJuridicoId:2,nome:'Empresa isolada',cnpj:'11222333000181',cpf:null,atividade:'Serviços',municipio:'Fortaleza',estado:'CE',porte:null,numeroFuncionarios:2,estabelecimentoFisico:false};
  await request(a,'/empresas','POST',{...dados,usuarioId:userB.id},400);
  await request({cookie:a.cookie},'/empresas','POST',dados,403);
  await request(a,'/empresas','POST',dados,403,{'X-CSRF-Token':b.csrf});
  await request(a,'/empresas','POST',dados,403,{Origin:'https://evil.example'});
  await request(anon,'/auth/login','POST',{email:userA.email,senha},403,{Origin:'https://evil.example'});
  await request(a,'/empresas','POST',dados,415,{'Content-Type':'text/plain'});
  const empresa=(await request(a,'/empresas','POST',dados,201)).data;
  assert.equal(empresa.usuarioId,userA.id);
  assert.equal((await pool.query('SELECT usuario_id FROM empresa WHERE id=$1',[empresa.id])).rows[0].usuario_id,userA.id);
  assert.equal((await request(a,`/empresas/${empresa.id}`)).data.porte,null);
  assert.equal((await request(a,'/empresas')).data.length,1);
  assert.equal((await request(b,'/empresas')).data.length,0);
  const pf=(await request(b,'/empresas','POST',{regimeJuridicoId:1,nome:'Pessoa física isolada',cpf:'52998224725',atividade:'Serviços',municipio:'Fortaleza',estado:'CE'},201)).data;
  assert.equal((await request(b,`/empresas/${pf.id}`)).data.numeroFuncionarios,0);
  const url=`/empresas/${empresa.id}/obrigacoes`;
  for(const actor of [b,anon]) {
    const expected=actor===anon?401:404;
    await request(actor,`/empresas/${empresa.id}`,'GET',undefined,expected);
    await request(actor,`/empresas/${empresa.id}`,'PATCH',dados,expected);
    await request(actor,url,'GET',undefined,expected);
    await request(actor,url+'/1/status','PATCH',{status:'Concluída'},expected);
    await request(actor,url+'/sincronizar','POST',{dataBase:'2026-01-31'},expected);
    await request(actor,`/empresas/${empresa.id}/documentos`,'GET',undefined,expected);
    await request(actor,`/empresas/${empresa.id}/documentos`,'POST',{nome:'Privado'},expected);
  }
  await request(a,`/empresas/${legacyEmpresa.id}`,'GET',undefined,404);
  assert.equal((await request(a,url)).data.total,0);
  assert.equal((await request(a,url+'/sincronizar','POST',{dataBase:'2026-01-31'})).data.vinculosCriados,1);
  let lista=(await request(a,url)).data;assert.equal(lista.total,1);assert.equal(lista.obrigacoes[0].vencimento,'2026-02-28');
  const id=lista.obrigacoes[0].id;
  await request(a,`${url}/${id}/status`,'PATCH',{status:'Concluída'});
  assert.equal((await pool.query('SELECT status FROM empresa_obrigacoes WHERE empresa_id=$1',[empresa.id])).rows[0].status,'Concluída');
  assert.equal((await request(a,url+'/sincronizar','POST',{dataBase:'2026-12-01'})).data.vinculosCriados,0);
  lista=(await request(a,url)).data;assert.equal(lista.obrigacoes[0].vencimento,'2026-02-28');assert.equal(lista.obrigacoes[0].status,'Concluída');
  await request(a,`/empresas/${empresa.id}`,'PATCH',{...dados,nome:'Empresa editada'});
  assert.equal((await request(a,`/empresas/${empresa.id}`)).data.nome,'Empresa editada');
  const {calcularResumo}=await import('../../Frontend/Regulariza-Front/src/utils/prazos.js');
  const {normalizarObrigacao}=await import('../../Frontend/Regulariza-Front/src/services/dados.js');
  assert.equal(calcularResumo(lista.obrigacoes.map(normalizarObrigacao)).concluidas,1);
  await request(a,'/empresas','POST',dados,409);
  await request(a,`/empresas/${empresa.id}/documentos`,'GET',undefined,404);
  console.log('PASS cadastro, hashes Argon2id, duplicidade, login, sessão, CSRF, propriedade, PF/PJ, obrigações e dashboard real.');
  const oldCookie=a.cookie;
  await request(a,'/auth/login','POST',{email:userA.email,senha});
  assert.notEqual(a.cookie,oldCookie);await request({cookie:oldCookie},'/auth/me','GET',undefined,401);
  const validCookie=a.cookie;
  await request({cookie:a.cookie},'/auth/logout','POST',{},403);
  await request(a,'/auth/logout','POST',{},204);
  await request({cookie:validCookie},'/auth/me','GET',undefined,401);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM auth_sessoes WHERE usuario_id=$1',[userA.id])).rows[0].n,0);
  await pool.query("UPDATE auth_sessoes SET expira_em = now() - interval '1 second' WHERE usuario_id=$1",[userB.id]);
  await request(b,'/auth/me','GET',undefined,401);
  console.log('PASS renovação do identificador no login, logout revogado no banco e expiração efetiva.');
  // Esgota a mesma janela de tentativas: nenhuma configuração de teste enfraquece o limitador.
  let throttled=false;
  for(let i=0;i<16;i++) {
    const res=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:5173'},body:JSON.stringify({email:'invalido@example.invalid',senha})});
    if(res.status===429) { assert.ok(Number(res.headers.get('retry-after'))>0);throttled=true;break; }
    assert.equal(res.status,401);
  }
  assert.ok(throttled);console.log('PASS limite de tentativas compartilhado no PostgreSQL (429 e Retry-After).');
  if (process.argv.includes('--serve')) {
    // Apenas este cluster recém-criado: reinicia janelas para a validação manual.
    await pool.query("UPDATE auth_tentativas SET reinicia_em = now() - interval '1 second'");
    console.log(`API isolada para teste visual: ${base}; encerre com Ctrl+C.`);
    await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); });
  }

} finally {
  if(server) await new Promise(resolve=>server.close(resolve));
  if(pool) await pool.end();
  if(started) run('pg_ctl',['-D',join(pasta,'data'),'-m','fast','-w','stop']);
}
process.exit(0);
