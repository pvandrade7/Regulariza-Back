# Revisão do catálogo — 13/11/2026

## Resultado e escopo

Consulta real ao PostgreSQL/Supabase realizada em transação `BEGIN READ ONLY`, encerrada com `ROLLBACK`. Confirmados os regimes 1 = Pessoa Física e 2 = Pessoa Jurídica, cinco obrigações e cinco critérios informados pelo usuário. Nenhuma escrita foi executada no banco.

Não há base para transformar esses cinco filtros em decisões legais completas usando somente os campos disponíveis. A proposta mantém os filtros como seleção para **triagem demonstrativa**, com nomes e descrições explícitos. Não acrescenta condições fiscais inventadas nem grupos redundantes apenas para exibir AND/OR. A interface local também informa a natureza demonstrativa, independentemente da aprovação do SQL.

## Avaliação por obrigação

| Registro | Filtro observado | Decisão segura e limitação |
| --- | --- | --- |
| 1 — declaração IRPF | PF | Selecionar revisão, não afirmar obrigação. Faltam residência fiscal, rendimentos, patrimônio, operações e ano-calendário. Ser PF não basta. |
| 2 — declaração IRPJ | PJ | Corrigir a descrição: IRPJ é tributo; o título atual não identifica uma obrigação acessória precisa. Não renomear automaticamente para ECF, pois isso reinterpretaria vínculos históricos. Verificar enquadramento e a obrigação específica. |
| 3 — FGTS | Funcionários > 0 | Sinal de revisão. Faltam categorias/vínculos dos trabalhadores e competência; a contagem agregada não prova incidência ou dispensa. |
| 4 — eSocial | Funcionários > 0 | Sinal de revisão, incompleto: há hipóteses envolvendo prestadores PF e situações sem movimento. Zero empregados não significa dispensa. |
| 5 — DCTF | PJ | Preservar como registro legado e indicar revisão da DCTFWeb/MIT. Para fatos geradores a partir de janeiro de 2025, débitos antes declarados na DCTF PGD passaram à DCTFWeb mensal via MIT. Não converter histórico em nova obrigação. |

A lista atual não é exaustiva. Um item selecionado não é obrigação legal confirmada; um item ausente não representa dispensa. Contadores e status são apenas controles dos registros cadastrados.

## Campos e contrato

- `regime_juridico_id`: os valores reais distinguem PF/PJ; não representam a natureza jurídica detalhada nem todas as equiparações tributárias.
- `numero_funcionarios`: sinaliza revisão trabalhista, mas não contém categoria, vínculo, remuneração, evento ou competência.
- `regime_tributario`: texto opcional (`regimeTributario` no ORM), sem enumeração no banco. Útil para recortes de revisão de uma obrigação específica; não basta para definir ECF/DCTFWeb. Ausente ou desconhecido não significa dispensa. O motor normaliza espaços externos e caixa, mas não sinônimos.
- `cnae_principal`: sete dígitos (`cnaePrincipal` no ORM), opcional. Nenhuma das fontes consultadas justifica filtrar estes cinco registros por um CNAE arbitrário. CNAE principal também não representa todas as atividades efetivamente exercidas.
- `porte`: não substitui regime tributário, faturamento ou natureza jurídica.
- `atividade`: texto livre não é classificação legal confiável. Não usar correspondência textual para inventar enquadramentos.
- `grupo`: inteiro no contrato Prisma. AND dentro do grupo, OR entre grupos; ausência de grupo usa 1. O controller e a sincronização já repassam os campos necessários.

## AND/OR verificável, sem alterar o catálogo real

O teste `test/catalogo-demonstrativo.test.js` contém uma fixture isolada de **recorte de revisão da ECF**, apoiada na orientação da Receita:

```
(PJ AND regime = Lucro Real)
OR (PJ AND regime = Lucro Presumido)
OR (PJ AND regime = Lucro Arbitrado)
```

É apenas um subconjunto de candidatos à revisão: a orientação também contempla imunes/isentas e exceções, como inatividade e órgãos públicos. Esses dados não estão suficientemente representados no cadastro. A fixture não foi inserida no banco e não substitui o registro IRPJ. Seu resultado falso não é certificado de dispensa. Nos filtros atuais de FGTS/eSocial, duplicar funcionários > 0 em grupos PF/PJ seria redundante para os regimes cadastrados e não resolveria as lacunas legais.

## SQL preparado, não executado

- `proposta.json`: snapshot dos campos que serão alterados e critérios observados; não contém dados pessoais de empresas.
- `aplicar.sql`: altera somente `nome` e `descricao` dos cinco registros.
- `reverter.sql`: restaura exatamente os nomes e descrições observados.
- `gerar-proposta.py`: gera os dois scripts a partir do snapshot, sem conexão com banco.

Ambos os SQLs são transacionais e idempotentes. Validam regimes e critérios, bloqueiam concorrência durante a execução e aceitam somente o estado original ou o estado proposto. Divergências causam exceção e impedem o commit. Não há DDL, migrations, DELETE, INSERT, mudança de RLS ou autenticação. Não tocam `empresa_obrigacoes`, status, vencimentos, periodicidade ou prazo. A reversão também aborta caso os dados tenham sido editados por terceiros; não sobrescreve silenciosamente essas mudanças.

**Execução depende de aprovação explícita.** Os SQLs não foram executados nem ensaiados no Supabase. As verificações locais de SQL são estáticas; não substituem uma execução em ambiente isolado. O banco real permanece com os critérios e nomes anteriores.

## Demonstração

1. Exibir o aviso de triagem na Central de Obrigações e no Dashboard.
2. PF sem funcionários: revisão IRPF. PJ sem funcionários: revisão IRPJ/DCTF. Isso não significa declaração obrigatória.
3. Com funcionários: acrescentar revisão de FGTS/eSocial; explicar os dados faltantes.
4. Nos detalhes, mostrar grupos, critérios atendidos e o significado de AND/OR.
5. Apresentar a fixture ECF pelos testes, identificada como recorte demonstrativo.
6. Vencimentos calculados pela periodicidade continuam demonstrativos; os não calculáveis permanecem ausentes. Não foram acrescentados prazos fiscais.

A sincronização já preserva vínculos e datas preenchidas e não exclui históricos. Nenhuma sincronização real foi disparada nesta revisão. Os testes usam mocks, não o Supabase.

## Fontes oficiais consultadas

- Receita Federal — [Quem deve declarar IRPF](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/quem/quem).
- Receita Federal — [Pessoas jurídicas obrigadas à ECF](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/sped/ecf/ecf/quais-pessoas-juridicas-estao-obrigadas-1).
- Receita Federal/eSocial — [Substituição da DCTF a partir de janeiro de 2025](https://www.gov.br/esocial/pt-br/noticias/receita-federal/receita-federal-divulga-esclarecimentos-iniciais-sobre-a-substituicao-da-dctf-a-partir-de-janeiro-de-2025).
- FGTS — [Regras e categorias de trabalhadores](https://www.fgts.gov.br/Paginas/sobre-o-fgts/regras.aspx).
- eSocial — [Manual S-1.3, consolidado até NO 03/2025](https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/mos-s-1-3-consolidada-ate-a-no-s-1-3-03-2025.pdf). Usado para a abrangência geral, sem codificar calendário, eventos ou detalhes operacionais específicos de versão.

## Validação local concluída

- Backend: `npm test`, 27 testes aprovados, incluindo aplicabilidade, AND/OR e sincronização.
- Frontend: `npm test`, 19 testes aprovados; `npm run build`, aprovado.
- `git diff --check`: sem erros nos dois repositórios.
- SQL: revisão estática de escopo e limites de nomes; não executado.
