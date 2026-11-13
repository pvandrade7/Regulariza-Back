#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/b0bfd5efb94f72b3d4750ca751471a96ccaae96547837b56f6b599210261a2ce/contract';
import startContract from '../../snapshots/b0bfd5efb94f72b3d4750ca751471a96ccaae96547837b56f6b599210261a2ce/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c413bb83e0befc93739fc9c041ba00d409690b7bc663db30eb527063a8b22daf/contract';
import endContract from '../../snapshots/c413bb83e0befc93739fc9c041ba00d409690b7bc663db30eb527063a8b22daf/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'criterios',
        column: col('grupo', 'int4', {
          notNull: true,
          default: lit(1),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
