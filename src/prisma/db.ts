import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import { Temporal } from "@js-temporal/polyfill";

import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

const runtime = globalThis as typeof globalThis & {
    Temporal?: typeof Temporal;
};

runtime.Temporal ??= Temporal;

export const db = postgres<Contract>({
    contractJson,
    url: process.env["DATABASE_URL"]!,
});