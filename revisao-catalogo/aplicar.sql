-- PROPOSTA NÃO EXECUTADA. Executar somente após aprovação explícita.
-- Apenas nomes/descrições; sem DDL, exclusões, vínculos, status ou vencimentos.
-- Idempotente; aborta integralmente se houver divergência do snapshot revisado.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.obrigacoes IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.criterios, public.regime_juridico IN SHARE MODE;
DO $revisao$
DECLARE
  origem jsonb := $origem$[{"id": 1, "nome": "Declaração de Imposto de Renda Pessoa Física", "descricao": "Declaração anual de rendimentos de pessoas físicas que atendam aos critérios de obrigatoriedade."}, {"id": 2, "nome": "Declaração de Imposto de Renda Pessoa Jurídica", "descricao": "Cumprimento das obrigações de declaração de informações fiscais da pessoa jurídica, conforme seu enquadramento."}, {"id": 3, "nome": "Recolhimento do FGTS", "descricao": "Recolhimento do Fundo de Garantia do Tempo de Serviço para trabalhadores abrangidos pela legislação."}, {"id": 4, "nome": "Envio de informações ao eSocial", "descricao": "Prestação de informações trabalhistas, previdenciárias e tributárias ao eSocial."}, {"id": 5, "nome": "Declaração de Débitos e Créditos Tributários Federais", "descricao": "Prestação de informações sobre débitos e créditos tributários federais, conforme as regras vigentes."}]$origem$::jsonb;
  destino jsonb := $destino$[{"id": 1, "nome": "IRPF — verificar obrigatoriedade da declaração (triagem)", "descricao": "Triagem demonstrativa: ser pessoa física não determina obrigação de declarar. Faltam residência fiscal, rendimentos, patrimônio, operações e ano-calendário. Conferir as hipóteses oficiais do exercício. Não é confirmação de obrigação legal."}, {"id": 2, "nome": "IRPJ — verificar obrigações conforme enquadramento (triagem)", "descricao": "Triagem demonstrativa: IRPJ é um tributo; não existe uma declaração única aplicável a toda PJ. ECF e outras obrigações dependem do enquadramento e do período. Faltam situação de atividade, natureza jurídica detalhada e histórico tributário. Não equiparar este registro histórico à ECF."}, {"id": 3, "nome": "Recolhimento do FGTS (triagem demonstrativa)", "descricao": "Triagem demonstrativa: número de funcionários positivo indica necessidade de verificar FGTS. Faltam categorias e vínculos dos trabalhadores e competência. Zero funcionários não prova dispensa. Datas calculadas pela periodicidade são apenas demonstrativas."}, {"id": 4, "nome": "Envio de informações ao eSocial (triagem demonstrativa)", "descricao": "Triagem demonstrativa: número de funcionários positivo indica necessidade de verificar eventos do eSocial. Também existem hipóteses envolvendo prestadores pessoa física e situações sem movimento. Faltam relações de trabalho, eventos, período e histórico. Zero funcionários não prova dispensa."}, {"id": 5, "nome": "DCTF (legado) — verificar DCTFWeb/MIT (triagem)", "descricao": "Registro histórico da DCTF. Para fatos geradores desde janeiro de 2025, os débitos antes informados na DCTF PGD passaram à DCTFWeb mensal via MIT. Ser PJ não confirma obrigatoriedade. Faltam fatos geradores, período, movimento e enquadramento. Triagem demonstrativa; preservar o histórico e verificar a obrigação atual."}]$destino$::jsonb;
  esperado jsonb := $criterios$[{"id": 1, "obrigacao_id": 3, "campo": "numero_funcionarios", "operador": ">", "valor": "0", "grupo": 1}, {"id": 2, "obrigacao_id": 4, "campo": "numero_funcionarios", "operador": ">", "valor": "0", "grupo": 1}, {"id": 3, "obrigacao_id": 1, "campo": "regime_juridico_id", "operador": "=", "valor": "1", "grupo": 1}, {"id": 4, "obrigacao_id": 2, "campo": "regime_juridico_id", "operador": "=", "valor": "2", "grupo": 1}, {"id": 5, "obrigacao_id": 5, "campo": "regime_juridico_id", "operador": "=", "valor": "2", "grupo": 1}]$criterios$::jsonb;
  item jsonb;
  atual jsonb;
  anterior jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.regime_juridico WHERE id=1 AND nome='Pessoa Física')
     OR NOT EXISTS (SELECT 1 FROM public.regime_juridico WHERE id=2 AND nome='Pessoa Jurídica') THEN
    RAISE EXCEPTION 'Regimes divergentes; revisar proposta';
  END IF;
  IF (SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id), '[]'::jsonb)
      FROM (SELECT id, obrigacao_id, campo, operador, valor, grupo FROM public.criterios
            WHERE obrigacao_id IN (1,2,3,4,5)) c) IS DISTINCT FROM esperado THEN
    RAISE EXCEPTION 'Critérios divergentes; revisar proposta';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(destino) LOOP
    SELECT value INTO anterior FROM jsonb_array_elements(origem) WHERE value->>'id'=item->>'id';
    SELECT jsonb_build_object('id',id,'nome',nome,'descricao',descricao) INTO atual
      FROM public.obrigacoes WHERE id=(item->>'id')::integer;
    IF atual IS DISTINCT FROM anterior AND atual IS DISTINCT FROM item THEN
      RAISE EXCEPTION 'Obrigação % divergente ou ausente; revisar proposta', item->>'id';
    END IF;
    IF atual IS DISTINCT FROM item THEN
      UPDATE public.obrigacoes SET nome=item->>'nome', descricao=item->>'descricao'
        WHERE id=(item->>'id')::integer;
    END IF;
  END LOOP;
END;
$revisao$;
COMMIT;
