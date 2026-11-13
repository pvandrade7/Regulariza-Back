import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { catalogoFiscal } from '../src/services/catalogoFiscal.js';
const sqlPath = new URL('./ampliar-catalogo-fiscal.sql', import.meta.url);
export function gerarSql() {
  return `-- Catálogo fiscal: somente inserções; preserva obrigações e vínculos existentes.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.obrigacoes, public.criterios IN SHARE ROW EXCLUSIVE MODE;
DO $catalogo$
DECLARE
  catalogo jsonb := $dados$${JSON.stringify(catalogoFiscal)}$dados$::jsonb;
  item jsonb;
  criterio jsonb;
  obrigacao_id_alvo integer;
  criterios_atuais jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.regime_juridico WHERE id=2 AND nome='Pessoa Jurídica') THEN
    RAISE EXCEPTION 'Regime jurídico divergente';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(catalogo) LOOP
    IF (SELECT count(*) FROM public.obrigacoes WHERE prazo=item->>'prazo' OR lower(btrim(nome))=lower(item->>'nome')) > 1 THEN
      RAISE EXCEPTION 'Catálogo duplicado: %', item->>'nome';
    END IF;
    SELECT id INTO obrigacao_id_alvo FROM public.obrigacoes WHERE prazo=item->>'prazo' OR lower(btrim(nome))=lower(item->>'nome');
    IF obrigacao_id_alvo IS NULL THEN
      INSERT INTO public.obrigacoes (nome,descricao,categoria,periodicidade,prazo,orgao_relacionado)
        VALUES (item->>'nome',item->>'descricao',item->>'categoria',item->>'periodicidade',item->>'prazo',item->>'orgao_relacionado')
        RETURNING id INTO obrigacao_id_alvo;
      FOR criterio IN SELECT value FROM jsonb_array_elements(item->'criterios') LOOP
        INSERT INTO public.criterios (obrigacao_id,campo,operador,valor,grupo)
          VALUES (obrigacao_id_alvo,criterio->>'campo',criterio->>'operador',criterio->>'valor',(criterio->>'grupo')::integer);
      END LOOP;
    ELSE
      IF NOT EXISTS (SELECT 1 FROM public.obrigacoes WHERE id=obrigacao_id_alvo
        AND nome=item->>'nome' AND descricao=item->>'descricao' AND categoria=item->>'categoria'
        AND periodicidade=item->>'periodicidade' AND prazo=item->>'prazo' AND orgao_relacionado=item->>'orgao_relacionado') THEN
        RAISE EXCEPTION 'Registro existente divergente: %', item->>'nome';
      END IF;
      SELECT coalesce(jsonb_agg(jsonb_build_object('campo',campo,'operador',operador,'valor',valor,'grupo',grupo)), '[]'::jsonb)
        INTO criterios_atuais FROM public.criterios WHERE obrigacao_id=obrigacao_id_alvo;
      IF jsonb_array_length(criterios_atuais) <> jsonb_array_length(item->'criterios')
        OR NOT criterios_atuais @> (item->'criterios') OR NOT (item->'criterios') @> criterios_atuais THEN
        RAISE EXCEPTION 'Critérios existentes divergentes: %', item->>'nome';
      END IF;
    END IF;
  END LOOP;
END;
$catalogo$;
COMMIT;
`;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.argv.includes('--apply')) {
    writeFileSync(sqlPath, gerarSql());
    console.log('SQL gerado; nenhuma conexão ou escrita no banco.');
  } else {
    const { pool } = await import('../src/database/pool.js');
    const client = await pool.connect();
    try {
      await client.query(readFileSync(sqlPath, 'utf8'));
      console.log(JSON.stringify((await client.query("SELECT id,nome,prazo FROM public.obrigacoes WHERE prazo LIKE 'REGRA:%' ORDER BY id")).rows));
    } catch (error) { await client.query('ROLLBACK'); console.error(error.message); process.exitCode=1; }
    finally { client.release(); await pool.end(); }
  }
}
