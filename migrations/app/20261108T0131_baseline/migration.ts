#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/e66d2344333c3fb331921bfb067a6b35f6e7f25c93f99a5abed0f24581a5f94a/contract';
import endContract from '../../snapshots/e66d2344333c3fb331921bfb067a6b35f6e7f25c93f99a5abed0f24581a5f94a/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'criterios',
        columns: [
          col('campo', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('obrigacao_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('operador', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('valor', 'character varying(150)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'criterios_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'empresa',
        columns: [
          col('atividade', 'character varying(150)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
          col('cnpj', 'character varying(14)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 14 } },
          }),
          col('cpf', 'character varying(11)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 11 } },
          }),
          col('estabelecimento_fisico', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('estado', 'character varying(2)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 2 } },
          }),
          col('id', 'uuid', {
            notNull: true,
            default: fn('gen_random_uuid()'),
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('municipio', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('nome', 'character varying(150)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
          col('numero_funcionarios', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('porte', 'character varying(50)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 50 } },
          }),
          col('regime_juridico_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('usuario_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'empresa_pkey' }),
          checkExpression('chk_numero_funcionarios', '(numero_funcionarios >= 0)'),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'empresa_contratacoes',
        columns: [
          col('empresa_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantidade', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('tipo_contratacao_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'empresa_contratacoes_pkey' }),
          checkExpression('chk_quantidade_contratacao', '(quantidade >= 0)'),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'empresa_obrigacoes',
        columns: [
          col('empresa_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('obrigacoes_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'character varying(30)', {
            notNull: true,
            default: lit('Pendente'),
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('vencimento', 'date', { codecRef: { codecId: 'pg/date-temporal@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'empresa_obrigacoes_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'obrigacoes',
        columns: [
          col('categoria', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('descricao', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nome', 'character varying(150)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
          col('orgao_relacionado', 'character varying(150)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
          col('periodicidade', 'character varying(50)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 50 } },
          }),
          col('prazo', 'character varying(100)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'obrigacoes_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'regime_juridico',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nome', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'regime_juridico_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'tipos_contratacao',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nome', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'tipos_contratacao_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'usuario',
        columns: [
          col('email', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('id', 'uuid', {
            notNull: true,
            default: fn('gen_random_uuid()'),
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('nome', 'character varying(150)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'usuario_pkey' })],
      }),
      this.addUnique({
        schema: 'public',
        table: 'empresa',
        constraint: 'empresa_cnpj_key',
        columns: ['cnpj'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'empresa',
        constraint: 'empresa_cpf_key',
        columns: ['cpf'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'empresa_contratacoes',
        constraint: 'uq_empresa_tipo_contratacao',
        columns: ['empresa_id', 'tipo_contratacao_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'empresa_obrigacoes',
        constraint: 'uq_empresa_obrigacao',
        columns: ['empresa_id', 'obrigacoes_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'regime_juridico',
        constraint: 'regime_juridico_nome_key',
        columns: ['nome'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'tipos_contratacao',
        constraint: 'tipos_contratacao_nome_key',
        columns: ['nome'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'usuario',
        constraint: 'usuario_email_key',
        columns: ['email'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'criterios',
        foreignKey: {
          name: 'fk_criterio_obrigacao',
          columns: ['obrigacao_id'],
          references: { schema: 'public', table: 'obrigacoes', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'empresa',
        foreignKey: {
          name: 'fk_empresa_regime_juridico',
          columns: ['regime_juridico_id'],
          references: { schema: 'public', table: 'regime_juridico', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'empresa',
        foreignKey: {
          name: 'fk_empresa_usuario',
          columns: ['usuario_id'],
          references: { schema: 'public', table: 'usuario', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'empresa_contratacoes',
        foreignKey: {
          name: 'fk_empresa_contratacoes_empresa',
          columns: ['empresa_id'],
          references: { schema: 'public', table: 'empresa', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'empresa_contratacoes',
        foreignKey: {
          name: 'fk_empresa_contratacoes_tipo',
          columns: ['tipo_contratacao_id'],
          references: { schema: 'public', table: 'tipos_contratacao', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'empresa_obrigacoes',
        foreignKey: {
          name: 'fk_empresa_obrigacoes_empresa',
          columns: ['empresa_id'],
          references: { schema: 'public', table: 'empresa', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'empresa_obrigacoes',
        foreignKey: {
          name: 'fk_empresa_obrigacoes_obrigacao',
          columns: ['obrigacoes_id'],
          references: { schema: 'public', table: 'obrigacoes', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
