#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/6f44d0972f8b69dd4d368ca21b65baac06856357adee0fd03c76ee079326bbff/contract';
import startContract from '../../snapshots/6f44d0972f8b69dd4d368ca21b65baac06856357adee0fd03c76ee079326bbff/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e259f47ff735657abc8c110f63a79bf5463e5911c2596568456f5f55b4bc1b05/contract';
import endContract from '../../snapshots/e259f47ff735657abc8c110f63a79bf5463e5911c2596568456f5f55b4bc1b05/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.enableRowLevelSecurity({ schema: 'public', table: 'criterios' }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'criterios',
        policy: {
          naming: { kind: 'exact', name: 'ALL' },
          tableName: 'criterios',
          namespaceId: 'public',
          operation: 'all',
          roles: ['public'],
          using: 'true',
          withCheck: 'true',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'empresa',
        policy: {
          naming: { kind: 'exact', name: 'ALL' },
          tableName: 'empresa',
          namespaceId: 'public',
          operation: 'all',
          roles: ['public'],
          using: 'true',
          withCheck: 'true',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'empresa_contratacoes',
        policy: {
          naming: { kind: 'exact', name: 'ALL' },
          tableName: 'empresa_contratacoes',
          namespaceId: 'public',
          operation: 'all',
          roles: ['public'],
          using: 'true',
          withCheck: 'true',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'empresa_obrigacoes',
        policy: {
          naming: { kind: 'exact', name: 'ALL' },
          tableName: 'empresa_obrigacoes',
          namespaceId: 'public',
          operation: 'all',
          roles: ['public'],
          using: 'true',
          withCheck: 'true',
          permissive: true,
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
