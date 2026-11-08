# Regulariza — Backend

API Express, Prisma 8 (`src/prisma/contract.prisma`) e PostgreSQL. Node validado: 22.19.0.

```sh
npm install
npm start
```

Autenticação real: `/auth/register`, `/auth/login`, `/auth/me`, `/auth/logout`. Senhas Argon2id, sessões PostgreSQL via cookie HttpOnly, CSRF e autorização por proprietário. Não existe acesso por UUID sem sessão. `POST /usuarios` é somente um alias do cadastro com senha.

Variáveis: `DATABASE_URL` (somente backend), `PORT` (3000), `CORS_ORIGINS`, `NODE_ENV`, `SESSION_TTL_SECONDS` (28800), `COOKIE_SAME_SITE` (lax) e, se necessário, `TRUST_PROXY` com os endereços reais dos proxies. Em produção, configurar origens HTTPS; cookie Secure é obrigatório. Não altere credenciais existentes nem exponha a URL do banco no Vite.

O banco configurado nesta tarefa já foi migrado e assinado. Para aplicar em outro banco com o schema anterior, revise `sql/auth/001_auth.sql`:

```sh
npm run auth:migrate:check
npm run auth:migrate
npx prisma db sign
```

A migração é aditiva e interrompe em colisões de e-mail/políticas incompatíveis. Não executar o baseline Prisma manualmente sobre banco existente. Usuários antigos preservam IDs e empresas, mas precisam de ativação com identidade verificada: não recebem senha padrão e não podem ser assumidos pelo e-mail/UUID.

```sh
npm test
npm run test:postgres
```

O teste PostgreSQL exige `initdb` e `pg_ctl` e cria um cluster próprio, sem tocar no Supabase. `npm run auth:prune` limpa somente sessões/contadores expirados (agendar diariamente).

Documentos/upload continuam sem suporte no modelo. Detalhes de arquitetura, migração, ativação e testes no [relatório de autenticação](../RELATORIO_AUTENTICACAO.md).
