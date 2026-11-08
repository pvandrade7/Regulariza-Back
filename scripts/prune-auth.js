import { pool } from '../src/database/pool.js';
// Limpa apenas material de autenticação já expirado, nunca usuários/empresas.
try {
    await pool.query('DELETE FROM auth_sessoes WHERE expira_em <= now()');
    await pool.query('DELETE FROM auth_tentativas WHERE reinicia_em <= now()');
    console.log('Sessões e contadores expirados removidos.');
} catch (error) { console.error('Limpeza não concluída:', error.code || error.name); process.exitCode = 1; }
finally { await pool.end(); }
