import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { validarCredenciais } from '../src/validators/authValidator.js';
import { hashPassword, verifyPassword } from '../src/services/passwordService.js';
import { readSessionToken, csrfToken, tokenHash } from '../src/services/sessionService.js';
import { requireCsrf } from '../src/middlewares/auth.js';
import { cookieName } from '../src/config/auth.js';

test('cadastro valida nome, email, senha e rejeita campos extras', () => {
  const body={nome:' Nome ',email:' NOME@EXAMPLE.COM ',senha:'senha de teste longa'};
  const r=validarCredenciais(body,true);assert.equal(r.erros.length,0);assert.equal(r.dados.email,'nome@example.com');assert.equal(r.dados.nome,'Nome');
  for(const patch of [{nome:' '},{email:'a@'},{senha:'1234567'},{senha:'a'.repeat(129)},{senha:null},{id:'forjado'}]) assert.ok(validarCredenciais({...body,...patch},true).erros.length);
  assert.ok(validarCredenciais(null,true).erros.length);
  assert.ok(validarCredenciais([],true).erros.length);
});
test('hash Argon2id com salt individual; conta sem hash não autentica', async () => {
  const senha=randomBytes(20).toString('hex');
  const h1=await hashPassword(senha), h2=await hashPassword(senha);
  assert.notEqual(h1,h2);assert.match(h1,/^\$argon2id\$v=19\$m=65536,t=3,p=1\$/);
  assert.equal(await verifyPassword(h1,senha),true);
  assert.equal(await verifyPassword(h1,senha+'errada'),false);
  assert.equal(await verifyPassword(null,senha),false);
});
test('cookie rejeita tokens inválidos e duplicados; CSRF é vinculado à sessão', () => {
  const token=randomBytes(32).toString('hex');
  assert.equal(readSessionToken({headers:{cookie:`${cookieName}=${token}`}}),token);
  assert.equal(readSessionToken({headers:{cookie:`${cookieName}=uuid`}}),null);
  assert.equal(readSessionToken({headers:{cookie:`${cookieName}=${token}; ${cookieName}=${token}`}}),null);
  assert.notEqual(csrfToken(token),token);assert.notEqual(csrfToken(token),tokenHash(token));
  let called=false, code;
  const res={status(c){code=c;return this;},json(){}};
  requireCsrf({method:'PATCH',csrfToken:csrfToken(token),get:()=>csrfToken(token)},res,()=>{called=true;});assert.equal(called,true);
  called=false;requireCsrf({method:'PATCH',csrfToken:csrfToken(token),get:()=>tokenHash(token)},res,()=>{called=true;});assert.equal(called,false);assert.equal(code,403);
});
test('produção exige HTTPS e usa cookie __Host-, Secure e HttpOnly', () => {
  const script="import {cookieName,cookieOptions} from './src/config/auth.js'; console.log(JSON.stringify({cookieName,...cookieOptions}));";
  const env={...process.env,NODE_ENV:'production',CORS_ORIGINS:'https://app.example.com',COOKIE_SAME_SITE:'none'};
  const result=spawnSync(process.execPath,['--input-type=module','-e',script],{env,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);const config=JSON.parse(result.stdout);
  assert.equal(config.cookieName,'__Host-regulariza_session');assert.equal(config.secure,true);assert.equal(config.httpOnly,true);assert.equal(config.sameSite,'none');assert.equal(config.path,'/');assert.equal(config.domain,undefined);
  const bad=spawnSync(process.execPath,['--input-type=module','-e',script],{env:{...env,CORS_ORIGINS:'http://app.example.com'},encoding:'utf8'});assert.notEqual(bad.status,0);
});
