-- Aditiva: não remove nem renumera usuários, empresas ou vínculos.
-- Execute dentro da transação do scripts/migrate-auth.js (lock_timeout e preflight).
ALTER TABLE public.usuario ADD COLUMN IF NOT EXISTS senha_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS usuario_email_normalizado_key ON public.usuario (lower(btrim(email)));
CREATE TABLE IF NOT EXISTS public.auth_sessoes (
    token_hash varchar(64) PRIMARY KEY,
    usuario_id uuid NOT NULL REFERENCES public.usuario(id) ON DELETE CASCADE,
    expira_em timestamptz(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessoes_usuario_idx ON public.auth_sessoes(usuario_id);
CREATE INDEX IF NOT EXISTS auth_sessoes_expiracao_idx ON public.auth_sessoes(expira_em);
CREATE TABLE IF NOT EXISTS public.auth_tentativas (
    chave varchar(64) PRIMARY KEY,
    quantidade integer NOT NULL,
    reinicia_em timestamptz(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_tentativas_expiracao_idx ON public.auth_tentativas(reinicia_em);
-- A aplicação autentica no Express, não no Supabase Auth. Sem políticas para
-- anon/authenticated: impede acesso direto pelo PostgREST às tabelas privadas.
-- O preflight confirma que a conexão do backend é proprietária/BYPASSRLS.
ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_obrigacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.empresa_contratacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_tentativas ENABLE ROW LEVEL SECURITY;
