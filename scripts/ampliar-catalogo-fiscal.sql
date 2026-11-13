-- Catálogo fiscal: somente inserções; preserva obrigações e vínculos existentes.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.obrigacoes, public.criterios IN SHARE ROW EXCLUSIVE MODE;
DO $catalogo$
DECLARE
  catalogo jsonb := $dados$[{"nome":"DAS-MEI","categoria":"Tributária","periodicidade":"Mensal","orgao_relacionado":"Receita Federal / Comitê Gestor do Simples Nacional","prazo":"REGRA:DAS_MEI","descricao":"Recolhimento mensal do MEI optante pelo SIMEI. Dia 20 do mês seguinte à competência, prorrogado para o próximo dia útil bancário. Enquadramento declarado no cadastro; confirmar opção vigente no período e eventuais prorrogações.","criterios":[{"campo":"regime_juridico_id","operador":"=","valor":"2","grupo":1},{"campo":"porte","operador":"=","valor":"MEI","grupo":1},{"campo":"regime_juridico_id","operador":"=","valor":"2","grupo":2},{"campo":"regime_tributario","operador":"=","valor":"SIMEI","grupo":2},{"campo":"regime_juridico_id","operador":"=","valor":"2","grupo":3},{"campo":"regime_tributario","operador":"=","valor":"MEI","grupo":3}]},{"nome":"DASN-SIMEI","categoria":"Tributária","periodicidade":"Anual","orgao_relacionado":"Receita Federal / Comitê Gestor do Simples Nacional","prazo":"REGRA:DASN_SIMEI","descricao":"Declaração anual de quem foi optante pelo SIMEI no ano-calendário, inclusive sem receita. Situação normal: 31 de maio do ano seguinte. Extinção e prorrogações possuem regras próprias. O cadastro atual não contém histórico de opção.","criterios":[{"campo":"regime_juridico_id","operador":"=","valor":"2","grupo":1},{"campo":"porte","operador":"=","valor":"MEI","grupo":1},{"campo":"regime_juridico_id","operador":"=","valor":"2","grupo":2},{"campo":"regime_tributario","operador":"=","valor":"SIMEI","grupo":2},{"campo":"regime_juridico_id","operador":"=","valor":"2","grupo":3},{"campo":"regime_tributario","operador":"=","valor":"MEI","grupo":3}]},{"nome":"DAS do Simples Nacional / PGDAS-D","categoria":"Tributária","periodicidade":"Mensal","orgao_relacionado":"Receita Federal / Comitê Gestor do Simples Nacional","prazo":"REGRA:DAS_SIMPLES","descricao":"Apuração e declaração mensal no PGDAS-D para optantes pelo Simples Nacional não enquadrados no SIMEI, inclusive sem receita; pagamento do DAS quando houver tributo devido. Dia 20 do mês seguinte, prorrogado para o próximo dia útil bancário. Confirmar opção vigente no período.","criterios":[{"campo":"regime_juridico_id","operador":"=","valor":"2","grupo":1},{"campo":"regime_tributario","operador":"=","valor":"Simples Nacional","grupo":1},{"campo":"porte","operador":"!=","valor":"MEI","grupo":1},{"campo":"porte","operador":"!=","valor":"SIMEI","grupo":1}]}]$dados$::jsonb;
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
