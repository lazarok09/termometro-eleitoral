# Termômetro Eleitoral

Painel quantitativo das maiores empresas da B3, construído para responder a uma
pergunta específica: **quanto do preço de uma ação brasileira é risco político, e
quanto é tudo o mais?**

A eleição presidencial de 2026 é o pano de fundo, mas a abordagem é a mesma que
serve para qualquer ciclo — separar o que o mercado já precificou do que ainda
está em aberto, e medir isso com o histórico real de preços em vez de intuição.

## O que o painel faz

**CDI vs IPCA+.** Compara Tesouro Selic / CDB 100% do CDI, Tesouro Prefixado,
Tesouro IPCA+ e um CDB 140% do CDI sob a Selic e o IPCA que você escolher.
As taxas vêm do CSV oficial do Tesouro Direto. A conta inclui IR regressivo e
mostra o juro real líquido. A lição central: com a Selic a 14% e o IPCA em 4%,
o IPCA+ **não** é automaticamente o melhor produto — o prefixado vence se a
inflação ficar abaixo de ~6%, e o CDI vence se os juros continuarem altos. O
IPCA+ passa à frente quando a inflação surpreende ou quando a Selic cai e você
já travou o juro real de hoje (~7,5%).

**Ranking.** Bancos, elétricas e as demais grandes da B3, com filtro **P/VP < 1**
para achar quem o mercado paga abaixo do patrimônio. Sharpe, volatilidade, beta,
queda máxima, P/L, dividendos e sensibilidade eleitoral. Todo retorno é comparado
ao CDI.

**Cenários.** Seis cenários pós-eleição (virada pró-mercado, continuidade com e
sem âncora fiscal, choque de petróleo, aversão global a risco) aplicam choques
simultâneos a Ibovespa, Selic, dólar, Brent e juro americano. Cada barra é
decomposta por canal, então dá para ver se o retorno projetado de uma empresa vem
de juros, de câmbio ou apenas do mercado subindo junto. Todos os controles são
ajustáveis.

**Eleições passadas.** Estudo de evento sobre 2014, 2018 e 2022. Para cada ação e
cada janela (90 pregões antes do primeiro turno, o pregão seguinte à apuração, a
transição de governo, o ano seguinte), mostra o retorno **em excesso ao
Ibovespa** — o que foi específico daquela empresa, não a maré que moveu todos.

**Preço típico.** Onde o preço de hoje está dentro da distribuição dos últimos 3
anos: mínima, quartis, mediana e máxima. A média aritmética mente quando a série
tem picos e colapsos; a mediana e os percentis respondem melhor à pergunta "qual
é o preço normal desta ação?".

Clicar em qualquer linha abre a análise completa da empresa, com gráfico de 3
anos marcando as eleições, decomposição de fatores e histórico eleitoral.

## As métricas, em detalhe

| Métrica | Como é calculada |
| --- | --- |
| Retorno a.a. | Retorno total anualizado em 3 anos, sobre fechamentos ajustados por proventos e desdobramentos |
| vs CDI | Retorno anualizado menos o CDI acumulado no mesmo período, a partir da série diária do Banco Central |
| Sharpe | Excesso sobre o CDI dividido pela volatilidade anualizada |
| Sortino | Mesmo numerador, mas dividido apenas pela volatilidade dos dias negativos |
| Beta | Covariância com o Ibovespa sobre a variância do Ibovespa, em retornos diários |
| Betas de fator | Regressão múltipla contra Ibovespa, dólar, Brent e Treasury de 10 anos. Os três últimos entram residualizados contra o Ibovespa, para medir efeito incremental e evitar dupla contagem no simulador |
| Sensibilidade eleitoral | Tracking error contra o Ibovespa em temporada eleitoral (dos 90 pregões antes do 1º turno aos 60 depois do 2º) dividido pelo tracking error no resto do tempo. Acima de 1,00 indica descolamento genuinamente eleitoral, já normalizado pela volatilidade natural da ação |
| Efeito Selic | Regressão do excesso de retorno sobre o Ibovespa em blocos de 21 pregões contra a variação da Selic meta no mesmo bloco. O coeficiente usado no simulador é encolhido quando a estatística t fica abaixo de 2, para que ruído não vire projeção |
| Preço típico | Mediana e quartis dos fechamentos ajustados dos últimos 3 anos, reescalados para a escala de preço de hoje, de modo a serem comparáveis à cotação de tela |

## Dados

Nada é sintético. O snapshot versionado em `data/market-snapshot.json` cobre de
janeiro de 2013 até a data da última coleta:

- **Yahoo Finance** — fechamentos diários ajustados, fechamentos nominais,
  dividendos e múltiplos (P/L, P/VP, ROE, margem, dívida) de 20 ações, mais
  Ibovespa, dólar, Brent e Treasury de 10 anos.
- **Banco Central do Brasil (SGS)** — CDI diário (série 12), Selic meta (432) e
  IPCA mensal (433).
- **Tesouro Nacional (Tesouro Transparente)** — CSV de taxas dos títulos
  ofertados: Selic, Prefixado e IPCA+, mais a série mensal do Tesouro IPCA+ 2035
  desde 2010.

O app lê o snapshot do disco, então roda sem rede e sem credenciais. Para
atualizar as cotações:

```bash
npm run fetch-data
```

O script busca o *crumb* de autenticação do Yahoo automaticamente, fatia as
consultas ao SGS ano a ano (a API do Banco Central recusa janelas longas em
séries diárias) e baixa o CSV de taxas do Tesouro Direto.

## Rodando localmente

```bash
npm install
npm run dev
```

A aplicação sobe em [http://localhost:43127](http://localhost:43127).

Para conferir os números calculados direto no terminal, sem abrir o navegador:

```bash
npx tsx scripts/check-metrics.mts
```

## Estrutura

```
data/market-snapshot.json      histórico de preços e séries macro
data/tesouro.json              cotações vigentes e série do IPCA+ 2035
scripts/fetch-market-data.mjs  coleta Yahoo Finance + Banco Central
scripts/fetch-tesouro.mjs      coleta Tesouro Transparente
scripts/check-metrics.mts      imprime métricas de ações no terminal
src/lib/quant.ts               estatística: regressão, drawdown, percentis, Sharpe
src/lib/analytics.ts           métricas de cada empresa a partir do snapshot
src/lib/fixed-income.ts        IR, juro real, IPCA+ vs CDI vs prefixado
src/lib/universe.ts            as 20 empresas e a tese de cada uma
src/lib/elections.ts           datas e janelas de 2014, 2018, 2022 e 2026
src/lib/scenarios.ts           cenários pós-eleição e projeção multifator
src/components/                interface (Next.js App Router, shadcn/ui, Recharts)
```

## Stack

Next.js 16 com App Router, TypeScript, Tailwind CSS 4, shadcn/ui e Recharts. O
cálculo acontece em Server Components; a interatividade (ordenação, filtros,
sliders) roda no cliente.

## Limites

Este projeto mede o passado. Betas, Sharpe e sensibilidade eleitoral descrevem
como essas ações **se comportaram**, não como vão se comportar — e o próprio
histórico do painel mostra por quê. Em 2014 o mercado passou meses precificando
uma alternância de governo que não veio, e devolveu tudo na apuração. Em 2022 a
eleição mal mexeu nos preços, e o estrago apareceu depois, na transição. Um
modelo ajustado sobre esses três episódios tem três observações, não trezentas.

O simulador de cenários é uma ferramenta de sensibilidade, não de previsão:
mostra como essas empresas costumaram reagir a choques parecidos, assumindo que
as relações históricas continuam valendo — que é justamente o que uma eleição
pode quebrar.

Conteúdo informativo e educacional. Não é recomendação de investimento, análise
de valores mobiliários nem oferta de compra ou venda de ativos.
