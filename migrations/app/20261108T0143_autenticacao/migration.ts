#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/6f44d0972f8b69dd4d368ca21b65baac06856357adee0fd03c76ee079326bbff/contract';
import endContract from '../../snapshots/6f44d0972f8b69dd4d368ca21b65baac06856357adee0fd03c76ee079326bbff/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e66d2344333c3fb331921bfb067a6b35f6e7f25c93f99a5abed0f24581a5f94a/contract';
import startContract from '../../snapshots/e66d2344333c3fb331921bfb067a6b35f6e7f25c93f99a5abed0f24581a5f94a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'auth_sessoes',
        columns: [
          col('expira_em', 'timestamptz(6)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 6 } },
          }),
          col('token_hash', 'character varying(64)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 64 } },
          }),
          col('usuario_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['token_hash'], { name: 'auth_sessoes_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'auth_tentativas',
        columns: [
          col('chave', 'character varying(64)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 64 } },
          }),
          col('quantidade', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('reinicia_em', 'timestamptz(6)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 6 } },
          }),
        ],
        constraints: [primaryKey(['chave'], { name: 'auth_tentativas_pkey' })],
      }),
      this.addColumn({
        schema: 'public',
        table: 'usuario',
        column: col('senha_hash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'auth_sessoes',
        index: 'auth_sessoes_expiracao_idx',
        columns: ['expira_em'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auth_sessoes',
        index: 'auth_sessoes_usuario_idx',
        columns: ['usuario_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auth_tentativas',
        index: 'auth_tentativas_expiracao_idx',
        columns: ['reinicia_em'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'usuario',
        index: 'usuario_email_normalizado_key',
        expression: 'lower(btrim(email::text))',
        extras: { unique: true },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'auth_sessoes',
        foreignKey: {
          name: 'auth_sessoes_usuario_id_fkey',
          columns: ['usuario_id'],
          references: { schema: 'public', table: 'usuario', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'auth_sessoes' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'auth_tentativas' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'empresa' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'empresa_contratacoes' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'empresa_obrigacoes' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'usuario' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
