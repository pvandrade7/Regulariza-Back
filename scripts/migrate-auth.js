import { readFile } from 'node:fs/promises';
import { pool } from '../src/database/pool.js';
const apply = process.argv.includes('--apply');
let client;
try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '30s'");
    if (apply) await client.query('LOCK TABLE public.usuario IN SHARE ROW EXCLUSIVE MODE');
    const { rows } = await client.query(`SELECT count(*)::int AS grupos FROM (
        SELECT lower(btrim(email)) FROM public.usuario GROUP BY lower(btrim(email)) HAVING count(*) > 1
    ) duplicados`);
    if (rows[0].grupos) throw new Error('MIGRATION_EMAIL_COLLISION');
    const security = await client.query(`SELECT
        (SELECT count(*) FROM pg_policy p WHERE p.polrelid=c.oid) AS policies,
        (c.relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user) OR
            (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname=current_user)) AS authorized
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
        AND c.relname IN ('usuario','empresa','empresa_obrigacoes','empresa_contratacoes','auth_sessoes','auth_tentativas')`);
    if (security.rows.some(row => Number(row.policies) > 0 || !row.authorized)) throw new Error('MIGRATION_RLS_REVIEW');
    if (apply) {
        await client.query(await readFile(new URL('../sql/auth/001_auth.sql', import.meta.url), 'utf8'));
        await client.query('COMMIT');
        console.log('Migração aditiva aplicada. Contas antigas preservadas, sem senha e sem acesso até ativação verificada.');
    } else {
        await client.query('ROLLBACK');
        console.log('Preflight aprovado: e-mails sem colisões, sem políticas RLS conflitantes e conexão do backend compatível. Nenhuma alteração aplicada.');
    }
} catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error(error.message === 'MIGRATION_EMAIL_COLLISION'
        ? 'Migração interrompida: colisões de e-mail; é necessária decisão sobre as contas. Nenhum dado alterado.'
        : error.message === 'MIGRATION_RLS_REVIEW'
        ? 'Migração interrompida: políticas RLS ou permissões exigem revisão. Nenhum dado alterado.'
        : `Migração não aplicada (${error.code || error.name}). Verifique conectividade/permissões e schema.`);
    process.exitCode = 1;
} finally { client?.release(); await pool.end(); }
