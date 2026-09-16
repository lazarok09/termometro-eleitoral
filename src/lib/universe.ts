export type Sector =
  | "Petróleo e Gás"
  | "Mineração e Siderurgia"
  | "Bancos"
  | "Mercado de Capitais"
  | "Energia Elétrica"
  | "Saneamento"
  | "Bens Industriais"
  | "Papel e Celulose"
  | "Consumo e Varejo"
  | "Telecom"
  | "Aluguel e Mobilidade";

/** Grau de influência do Estado no negócio — o canal mais direto de risco eleitoral. */
export type StateControl = "estatal" | "ex-estatal" | "regulada" | "privada";

/** De onde vem a receita: quem fatura em dólar sofre menos com política local. */
export type RevenueBase = "doméstica" | "exportadora" | "mista";

export type Asset = {
  ticker: string;
  /** Símbolo no Yahoo Finance. */
  symbol: string;
  name: string;
  sector: Sector;
  stateControl: StateControl;
  revenueBase: RevenueBase;
  /** Por que essa ação reage (ou não) a uma eleição. */
  thesis: string;
};

export const UNIVERSE: Asset[] = [
  {
    ticker: "PETR4",
    symbol: "PETR4.SA",
    name: "Petrobras",
    sector: "Petróleo e Gás",
    stateControl: "estatal",
    revenueBase: "mista",
    thesis:
      "União controla o voto. Preço de combustível, ritmo de investimento e política de dividendos mudam conforme o governo, e isso entra no múltiplo antes de entrar no lucro.",
  },
  {
    ticker: "BBAS3",
    symbol: "BBAS3.SA",
    name: "Banco do Brasil",
    sector: "Bancos",
    stateControl: "estatal",
    revenueBase: "doméstica",
    thesis:
      "Negocia com desconto estrutural frente aos bancos privados por risco de uso político do balanço (crédito direcionado, subsídio agrícola). Um governo visto como pró-disciplina de capital comprime esse desconto.",
  },
  {
    ticker: "CMIG4",
    symbol: "CMIG4.SA",
    name: "Cemig",
    sector: "Energia Elétrica",
    stateControl: "estatal",
    revenueBase: "doméstica",
    thesis:
      "Controlada pelo governo de Minas Gerais. Cada ciclo eleitoral reabre a discussão sobre privatização, dividendos e uso da empresa como instrumento fiscal do estado.",
  },
  {
    ticker: "AXIA3",
    symbol: "AXIA3.SA",
    name: "Axia Energia (ex-Eletrobras)",
    sector: "Energia Elétrica",
    stateControl: "ex-estatal",
    revenueBase: "doméstica",
    thesis:
      "A antiga Eletrobras, rebatizada. Privatizada, mas com disputa aberta sobre o poder de voto da União. É a ação elétrica em que a tese eleitoral ainda é mais jurídica que operacional.",
  },
  {
    ticker: "CPLE3",
    symbol: "CPLE3.SA",
    name: "Copel",
    sector: "Energia Elétrica",
    stateControl: "ex-estatal",
    revenueBase: "doméstica",
    thesis:
      "Elétrica paranaense privatizada. Geração, transmissão e distribuição no mesmo grupo: o múltiplo reage a tarifa, hidrologia e ao desconto que o mercado ainda cobra da origem estatal.",
  },
  {
    ticker: "EQTL3",
    symbol: "EQTL3.SA",
    name: "Equatorial",
    sector: "Energia Elétrica",
    stateControl: "privada",
    revenueBase: "doméstica",
    thesis:
      "Distribuidora que cresce comprando concessões difíceis e melhorando perda e inadimplência. É tese de execução, não de Brasília.",
  },
  {
    ticker: "ENGI11",
    symbol: "ENGI11.SA",
    name: "Energisa",
    sector: "Energia Elétrica",
    stateControl: "privada",
    revenueBase: "doméstica",
    thesis:
      "Mesmo modelo da Equatorial: distribuição em praças com perda alta, alavancada em melhoria operacional e ciclo de juros.",
  },
  {
    ticker: "CPFE3",
    symbol: "CPFE3.SA",
    name: "CPFL Energia",
    sector: "Energia Elétrica",
    stateControl: "privada",
    revenueBase: "doméstica",
    thesis:
      "Controlada pela State Grid. Distribuição e geração com fluxo mais previsível que as estatais — o preço segue juros e tarifa, não pesquisa eleitoral.",
  },
  {
    ticker: "EGIE3",
    symbol: "EGIE3.SA",
    name: "Engie Brasil",
    sector: "Energia Elétrica",
    stateControl: "privada",
    revenueBase: "doméstica",
    thesis:
      "Geração contratada, controlada pela Engie francesa. Perfil de renda: o que move é o juro real, porque o dividendo compete com o Tesouro IPCA+.",
  },
  {
    ticker: "ENEV3",
    symbol: "ENEV3.SA",
    name: "Eneva",
    sector: "Energia Elétrica",
    stateControl: "privada",
    revenueBase: "doméstica",
    thesis:
      "Geração térmica a gás. Não é a conta de luz do Copel: o resultado depende de despacho, gás e contratos — mais commodity do que tarifa.",
  },
  {
    ticker: "ALUP11",
    symbol: "ALUP11.SA",
    name: "Alupar",
    sector: "Energia Elétrica",
    stateControl: "privada",
    revenueBase: "mista",
    thesis:
      "Transmissão no Brasil e no Peru. Receita contratada, inflação no contrato: o concorrente direto é o IPCA+ do Tesouro, não o Ibovespa.",
  },
  {
    ticker: "ISAE4",
    symbol: "ISAE4.SA",
    name: "ISA Energia",
    sector: "Energia Elétrica",
    stateControl: "privada",
    revenueBase: "doméstica",
    thesis:
      "Transmissão (ex-Transmissão Paulista). Mesma lógica da Taesa: juro alto comprime o múltiplo mesmo com contrato estável.",
  },
  {
    ticker: "AURE3",
    symbol: "AURE3.SA",
    name: "Auren",
    sector: "Energia Elétrica",
    stateControl: "privada",
    revenueBase: "doméstica",
    thesis:
      "Geração renovável nascida da cisão com a Votorantim. Ainda negocia como empresa em formação: o preço baixo pode ser desconto de execução, não margem de segurança.",
  },
  {
    ticker: "SBSP3",
    symbol: "SBSP3.SA",
    name: "Sabesp",
    sector: "Saneamento",
    stateControl: "ex-estatal",
    revenueBase: "doméstica",
    thesis:
      "Privatizada sob governo estadual. Tarifa e marco do saneamento dependem de regulação, então o risco político é real mas estadual e regulatório, não federal.",
  },
  {
    ticker: "B3SA3",
    symbol: "B3SA3.SA",
    name: "B3",
    sector: "Mercado de Capitais",
    stateControl: "privada",
    revenueBase: "doméstica",
    thesis:
      "Ganha com volume negociado. É a forma mais pura de apostar em queda de juros: Selic caindo empurra investidor da renda fixa para a Bolsa, e a B3 cobra pedágio em cada negócio.",
  },
  {
    ticker: "ITUB4",
    symbol: "ITUB4.SA",
    name: "Itaú Unibanco",
    sector: "Bancos",
    stateControl: "privada",
    revenueBase: "doméstica",
    thesis:
      "Exposto ao ciclo de crédito e à Selic, sem o desconto político do banco estatal. Reage à eleição pela via macro (juros, inadimplência), não pela via de controle.",
  },
  {
    ticker: "BBDC4",
    symbol: "BBDC4.SA",
    name: "Bradesco",
    sector: "Bancos",
    stateControl: "privada",
    revenueBase: "doméstica",
    thesis:
      "Mesma lógica do Itaú, com carteira historicamente mais sensível a inadimplência — o que amplifica o efeito de um ciclo de juros.",
  },
  {
    ticker: "SANB11",
    symbol: "SANB11.SA",
    name: "Santander Brasil",
    sector: "Bancos",
    stateControl: "privada",
    revenueBase: "doméstica",
    thesis:
      "Controlado pelo Santander espanhol. O desconto contra o Itaú costuma vir de rentabilidade, não de risco político — então barato aqui é tese de execução, não de eleição.",
  },
  {
    ticker: "BRSR6",
    symbol: "BRSR6.SA",
    name: "Banrisul",
    sector: "Bancos",
    stateControl: "estatal",
    revenueBase: "doméstica",
    thesis:
      "Banco do estado do Rio Grande do Sul. Liquidez menor, desconto de controle estadual e carteira concentrada na região — o múltiplo baixo costuma ser permanente, não oportunidade óbvia.",
  },
  {
    ticker: "ABCB4",
    symbol: "ABCB4.SA",
    name: "ABC Brasil",
    sector: "Bancos",
    stateControl: "privada",
    revenueBase: "doméstica",
    thesis:
      "Banco médio de atacado. Sem o guarda-chuva de um gigante privado nem o desconto político de um estatal: o preço segue o ciclo de crédito e o funding.",
  },
  {
    ticker: "BMGB4",
    symbol: "BMGB4.SA",
    name: "Banco BMG",
    sector: "Bancos",
    stateControl: "privada",
    revenueBase: "doméstica",
    thesis:
      "Foco em consignado e varejo de baixa renda. O P/VP baixo costuma acompanhar custo de capital alto e risco de crédito — banana aparente, caro se a inadimplência abrir.",
  },
  {
    ticker: "BPAC11",
    symbol: "BPAC11.SA",
    name: "BTG Pactual",
    sector: "Mercado de Capitais",
    stateControl: "privada",
    revenueBase: "mista",
    thesis:
      "Banco de investimento: receita depende de emissões, fusões e gestão de recursos. Tudo isso reabre quando o custo de capital cai.",
  },
  {
    ticker: "VALE3",
    symbol: "VALE3.SA",
    name: "Vale",
    sector: "Mineração e Siderurgia",
    stateControl: "privada",
    revenueBase: "exportadora",
    thesis:
      "Fatura em dólar com minério de ferro. China e câmbio explicam muito mais o preço da ação do que qualquer pesquisa eleitoral.",
  },
  {
    ticker: "GGBR4",
    symbol: "GGBR4.SA",
    name: "Gerdau",
    sector: "Mineração e Siderurgia",
    stateControl: "privada",
    revenueBase: "mista",
    thesis:
      "Aço tem perna doméstica (construção) e perna americana. Sofre com juros altos aqui, mas o resultado nos EUA amortece o risco político local.",
  },
  {
    ticker: "WEGE3",
    symbol: "WEGE3.SA",
    name: "WEG",
    sector: "Bens Industriais",
    stateControl: "privada",
    revenueBase: "exportadora",
    thesis:
      "Multinacional brasileira que vende motores e equipamentos elétricos no mundo todo. A tese é execução e dólar, não Brasília.",
  },
  {
    ticker: "EMBJ3",
    symbol: "EMBJ3.SA",
    name: "Embraer",
    sector: "Bens Industriais",
    stateControl: "privada",
    revenueBase: "exportadora",
    thesis:
      "Carteira de pedidos em dólar e exposição a defesa. O governo importa como cliente e diplomacia comercial, não como controlador.",
  },
  {
    ticker: "SUZB3",
    symbol: "SUZB3.SA",
    name: "Suzano",
    sector: "Papel e Celulose",
    stateControl: "privada",
    revenueBase: "exportadora",
    thesis:
      "Celulose é commodity global cotada em dólar. Historicamente funciona como hedge: quando o risco político derruba o real, a receita sobe em reais.",
  },
  {
    ticker: "PRIO3",
    symbol: "PRIO3.SA",
    name: "PRIO",
    sector: "Petróleo e Gás",
    stateControl: "privada",
    revenueBase: "exportadora",
    thesis:
      "Petróleo sem o Estado no conselho. Serve para separar o que em PETR4 é Brent e o que é risco político.",
  },
  {
    ticker: "TAEE11",
    symbol: "TAEE11.SA",
    name: "Taesa",
    sector: "Energia Elétrica",
    stateControl: "regulada",
    revenueBase: "doméstica",
    thesis:
      "Transmissão com receita contratada e indexada à inflação. Concorre diretamente com o CDI: quando a Selic sobe, o dividendo fica menos atraente e a ação cai.",
  },
  {
    ticker: "VIVT3",
    symbol: "VIVT3.SA",
    name: "Telefônica Brasil (Vivo)",
    sector: "Telecom",
    stateControl: "regulada",
    revenueBase: "doméstica",
    thesis:
      "Fluxo de caixa previsível e defensivo. O risco político é regulatório (leilões, tarifas), não de controle acionário.",
  },
  {
    ticker: "ABEV3",
    symbol: "ABEV3.SA",
    name: "Ambev",
    sector: "Consumo e Varejo",
    stateControl: "privada",
    revenueBase: "doméstica",
    thesis:
      "Consumo básico com baixa alavancagem. O que move é renda da população e reforma tributária sobre bebidas.",
  },
  {
    ticker: "RADL3",
    symbol: "RADL3.SA",
    name: "Raia Drogasil",
    sector: "Consumo e Varejo",
    stateControl: "privada",
    revenueBase: "doméstica",
    thesis:
      "Varejo defensivo: remédio se compra em qualquer cenário. Ainda assim sofre com juros altos, porque o crescimento vale menos quando descontado a 14%.",
  },
  {
    ticker: "LREN3",
    symbol: "LREN3.SA",
    name: "Lojas Renner",
    sector: "Consumo e Varejo",
    stateControl: "privada",
    revenueBase: "doméstica",
    thesis:
      "Varejo discricionário é o termômetro mais sensível de juros e renda. Costuma ser das primeiras a reagir quando a curva de juros abre ou fecha.",
  },
  {
    ticker: "RENT3",
    symbol: "RENT3.SA",
    name: "Localiza",
    sector: "Aluguel e Mobilidade",
    stateControl: "privada",
    revenueBase: "doméstica",
    thesis:
      "Modelo intensivo em capital financiado por dívida. É praticamente uma aposta alavancada na trajetória da Selic.",
  },
];

/** Fatores de risco usados na regressão multifator. */
export const FACTORS = {
  ibov: { symbol: "^BVSP", label: "Ibovespa" },
  usdbrl: { symbol: "USDBRL=X", label: "Dólar/Real" },
  brent: { symbol: "BZ=F", label: "Petróleo Brent" },
  ust10y: { symbol: "^TNX", label: "Treasury 10 anos" },
} as const;

export type FactorKey = keyof typeof FACTORS;

export const ALL_SYMBOLS = [
  ...UNIVERSE.map((a) => a.symbol),
  ...Object.values(FACTORS).map((f) => f.symbol),
];

export function assetByTicker(ticker: string): Asset | undefined {
  return UNIVERSE.find((a) => a.ticker === ticker);
}
