import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
const options = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 };
export const hashPassword = senha => argon2.hash(senha, options);
// Trabalho equivalente para usuário inexistente/legado, sem senha conhecida reutilizável.
let dummyHash;
export async function verifyPassword(hash, senha) {
    dummyHash ??= hashPassword(randomBytes(32).toString('hex'));
    const target = hash || await dummyHash;
    const valid = await argon2.verify(target, senha);
    return Boolean(hash) && valid;
}
