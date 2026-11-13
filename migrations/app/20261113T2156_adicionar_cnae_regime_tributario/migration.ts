#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/b0bfd5efb94f72b3d4750ca751471a96ccaae96547837b56f6b599210261a2ce/contract';
import endContract from '../../snapshots/b0bfd5efb94f72b3d4750ca751471a96ccaae96547837b56f6b599210261a2ce/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e259f47ff735657abc8c110f63a79bf5463e5911c2596568456f5f55b4bc1b05/contract';
import startContract from '../../snapshots/e259f47ff735657abc8c110f63a79bf5463e5911c2596568456f5f55b4bc1b05/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'empresa',
        column: col('cnae_principal', 'character varying(7)', {
          codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 7 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'empresa',
        column: col('regime_tributario', 'character varying(50)', {
          codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 50 } },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
