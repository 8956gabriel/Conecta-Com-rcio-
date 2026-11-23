// =============================================================================
// TREINAMENTO ANEPS — CONTEÚDO INICIAL (o administrador instala, revisa e amplia)
// Material de estudo preparatório, elaborado de forma independente. NÃO é
// material oficial da ANEPS nem certificação. Antes de usar, o administrador
// deve conferir com a matriz vigente da certificação escolhida (edital/manual
// do candidato) e atualizar normas, valores e prazos.
// Questões: alternativas A–D, "c" = índice da correta (0 = A), "uso":
// "simulado" (gabarito escondido até o fim do simulado) ou "estudo" (questão
// comentada aberta no módulo).
// =============================================================================

export const AVISO_ANEPS = "Ambiente de preparação independente do Mais BB Digital. Não é certificação, curso oficial ou material da ANEPS. A certificação é feita somente pela entidade certificadora, conforme o edital e a matriz vigentes.";

const MODULOS_BASE = [
  {
    ordem: 1, titulo: "Sistema Financeiro Nacional",
    descricao: "Estrutura do SFN, órgãos normativos, supervisores e operadores.",
    teoria: `O Sistema Financeiro Nacional (SFN) é o conjunto de órgãos, entidades e instituições que tornam possível a circulação de dinheiro e a intermediação entre quem tem recursos sobrando (poupadores) e quem precisa deles (tomadores).

Ele se organiza em três níveis:
• Órgãos normativos — definem as regras. O principal é o Conselho Monetário Nacional (CMN), formado pelo Ministro da Fazenda (presidente), pelo Ministro do Planejamento e pelo Presidente do Banco Central. Também são normativos o Conselho Nacional de Seguros Privados (CNSP) e o Conselho Nacional de Previdência Complementar (CNPC).
• Supervisores — fiscalizam e fazem cumprir as regras. O Banco Central do Brasil (BCB) supervisiona bancos, cooperativas de crédito, financeiras e instituições de pagamento; a Comissão de Valores Mobiliários (CVM) cuida do mercado de valores mobiliários (ações, debêntures, fundos); a Susep cuida de seguros, capitalização e previdência aberta; a Previc cuida dos fundos de pensão (previdência fechada).
• Operadores — as instituições que atendem o público: bancos múltiplos, comerciais e de investimento, Caixa Econômica Federal, cooperativas de crédito, sociedades de crédito, financiamento e investimento (financeiras), corretoras, distribuidoras, instituições de pagamento, entre outras.

O Banco Central executa a política monetária (por exemplo, por meio da taxa Selic definida pelo Copom), emite a moeda, administra o sistema de pagamentos (como o Pix) e autoriza o funcionamento das instituições que supervisiona.

O Fundo Garantidor de Créditos (FGC) é uma entidade privada que protege depositantes e investidores em caso de intervenção ou liquidação de uma instituição associada, até o limite por CPF/CNPJ e por instituição definido em seu regulamento (confira o valor vigente no site do FGC).`,
    resumo: `• CMN = órgão normativo máximo do SFN.
• BCB = supervisiona bancos, cooperativas, financeiras e instituições de pagamento; executa a política monetária; administra o Pix.
• CVM = mercado de valores mobiliários. Susep = seguros e previdência aberta. Previc = previdência fechada.
• Copom define a meta da taxa Selic.
• FGC = garantia privada para depósitos e alguns investimentos, com limite por CPF/CNPJ e por instituição.`,
    questoes: [
      { e: "Qual é o órgão normativo máximo do Sistema Financeiro Nacional?", a: ["Banco Central do Brasil", "Conselho Monetário Nacional", "Comissão de Valores Mobiliários", "Banco do Brasil"], c: 1, cm: "O CMN é o órgão normativo máximo do SFN: define as diretrizes da política monetária, de crédito e cambial. O Banco Central executa e fiscaliza, mas não é o órgão normativo máximo." },
      { e: "A fiscalização dos bancos comerciais e das cooperativas de crédito cabe:", a: ["à CVM", "à Susep", "ao Banco Central do Brasil", "à Previc"], c: 2, cm: "O Banco Central supervisiona as instituições financeiras e as de pagamento, incluindo bancos e cooperativas de crédito." },
      { e: "O mercado de valores mobiliários, como ações e debêntures, é regulado e fiscalizado principalmente:", a: ["pela CVM", "pela Susep", "pelo FGC", "pela Previc"], c: 0, cm: "A Comissão de Valores Mobiliários (CVM) regula e fiscaliza o mercado de valores mobiliários." },
      { e: "Seguros, títulos de capitalização e previdência complementar aberta são supervisionados:", a: ["pelo Banco Central", "pela Susep", "pela CVM", "pelo Copom"], c: 1, cm: "A Superintendência de Seguros Privados (Susep) supervisiona seguros, capitalização e previdência aberta. A previdência fechada (fundos de pensão) fica com a Previc." },
      { e: "Quem define a meta da taxa básica de juros (Selic)?", a: ["O Conselho Monetário Nacional", "O Comitê de Política Monetária (Copom) do Banco Central", "O Ministério da Fazenda", "A Febraban"], c: 1, cm: "O Copom, formado pela diretoria do Banco Central, define a meta da Selic em reuniões periódicas.", uso: "estudo" },
    ],
  },
  {
    ordem: 2, titulo: "Correspondentes Bancários",
    descricao: "O que é o correspondente no País, o que pode fazer, responsabilidades e vedações.",
    teoria: `O correspondente no País é uma empresa contratada por uma instituição financeira (ou outra instituição autorizada pelo Banco Central) para prestar serviços de atendimento aos clientes e usuários em nome dela. As regras gerais estão na Resolução CMN nº 4.935/2021, que substituiu a antiga Resolução nº 3.954/2011 (confira sempre a norma vigente).

Pontos centrais:
• O correspondente atua por conta e sob as diretrizes da instituição contratante, que assume inteira responsabilidade pelo atendimento prestado aos clientes por meio dele.
• Pode, conforme o contrato, receber e encaminhar propostas de abertura de conta, receber e pagar (recebimentos e pagamentos), encaminhar propostas de operações de crédito e de cartão, executar serviços de cobrança, entre outras atividades previstas na norma.
• Quem atua no atendimento de operações de crédito precisa ser certificado por entidade de reconhecida capacidade técnica — é aí que entra a certificação de correspondentes (por exemplo, a da ANEPS).
• O correspondente não decide a aprovação de crédito: ele recebe a proposta, confere documentos e encaminha. A análise e a decisão são da instituição contratante.
• Não pode cobrar do cliente, por conta própria, tarifas ou valores pelos serviços prestados em nome da instituição.
• Deve identificar-se de forma clara como correspondente, informando a instituição contratante e os canais de atendimento e de ouvidoria dela.

Na prática do Mais BB: atender bem, orientar com informações oficiais, conferir documentos, encaminhar pelos sistemas autorizados e nunca prometer aprovação.`,
    resumo: `• Norma geral: Resolução CMN nº 4.935/2021.
• A instituição contratante responde pelos serviços prestados pelo correspondente.
• Correspondente encaminha propostas; a decisão de crédito é da instituição.
• Atendimento em crédito exige profissional certificado.
• Proibido cobrar tarifas próprias do cliente pelos serviços prestados em nome da instituição.
• Identificação clara + divulgação dos canais da instituição e da ouvidoria.`,
    questoes: [
      { e: "Em relação aos serviços prestados pelo correspondente aos clientes, a responsabilidade perante o cliente é:", a: ["exclusiva do correspondente", "da instituição financeira contratante", "do Banco Central", "do próprio cliente"], c: 1, cm: "A instituição contratante assume inteira responsabilidade pelo atendimento prestado por meio do correspondente. Por isso ela define diretrizes, treina e fiscaliza." },
      { e: "Quanto às propostas de crédito, o papel do correspondente é:", a: ["aprovar ou recusar o crédito", "definir a taxa de juros conforme o perfil do cliente", "receber a proposta, conferir documentos e encaminhar à instituição", "garantir a liberação em até 24 horas"], c: 2, cm: "O correspondente recebe e encaminha. A análise e a decisão são da instituição contratante; prometer aprovação ou prazo é conduta inadequada." },
      { e: "Um correspondente pode cobrar do cliente uma 'taxa de serviço' própria pelo atendimento feito em nome do banco?", a: ["Sim, desde que avise antes", "Sim, se o valor for pequeno", "Não, é vedado cobrar tarifas por conta própria", "Sim, apenas em operações de crédito"], c: 2, cm: "É vedado ao correspondente cobrar do cliente, por conta própria, tarifas ou valores pelos serviços prestados em nome da instituição contratante." },
      { e: "Qual exigência se aplica a quem atende operações de crédito no correspondente?", a: ["Ter curso superior em Economia", "Ser certificado por entidade de reconhecida capacidade técnica", "Ter registro na CVM", "Ser funcionário concursado do banco"], c: 1, cm: "A regulamentação exige que os profissionais que atuam em operações de crédito sejam certificados, como na certificação de correspondentes." },
      { e: "Qual é hoje a norma geral do CMN sobre a contratação de correspondentes no País?", a: ["Resolução CMN nº 4.935/2021", "Lei nº 8.078/1990", "Lei Complementar nº 105/2001", "Resolução CMN nº 2.878/2001"], c: 0, cm: "A Resolução CMN nº 4.935/2021 consolidou as regras de correspondentes e substituiu a Resolução nº 3.954/2011. Confira se houve atualização posterior.", uso: "estudo" },
    ],
  },
  {
    ordem: 3, titulo: "Produtos e Serviços Financeiros",
    descricao: "Contas, meios de pagamento, investimentos básicos, seguros e capitalização.",
    teoria: `Produtos e serviços mais comuns no atendimento:
• Conta corrente: movimentação do dia a dia; pode ter pacote de tarifas. Existem serviços essenciais que não podem ser cobrados (como fornecimento de cartão de débito e certo número de saques e transferências por mês, conforme a regulamentação vigente).
• Conta de pagamento e conta poupança: a poupança tem rendimento definido em lei e cobertura do FGC.
• Meios de pagamento: Pix (instantâneo, 24h, gerido pelo Banco Central), TED, boleto, cartão de débito e de crédito.
• Cartão de crédito: atenção ao rotativo e ao parcelamento da fatura, que costumam ter juros elevados — orientar o cliente a pagar o valor total sempre que possível.
• Investimentos de renda fixa: poupança, CDB, LCI, LCA, Tesouro Direto. Investimento envolve risco e deve respeitar o perfil do investidor (suitability).
• Seguros e capitalização: seguro protege contra risco; título de capitalização é forma de guardar dinheiro com sorteios — não é investimento e não deve ser apresentado como tal.
• Consórcio: grupo de pessoas que contribui para adquirir bens por sorteio ou lance; administrado por empresa autorizada pelo Banco Central.

Venda responsável: ofereça o que atende à necessidade do cliente, explique custos, riscos e condições, e nunca condicione um produto à compra de outro (venda casada é proibida pelo Código de Defesa do Consumidor).`,
    resumo: `• Pix: instantâneo, 24h, regras do Banco Central.
• Rotativo do cartão = juros altos; orientar pagamento total.
• Capitalização não é investimento.
• Investimento exige adequação ao perfil (suitability).
• Venda casada é proibida (CDC).
• Serviços essenciais de conta não podem ser cobrados.`,
    questoes: [
      { e: "Um cliente quer guardar dinheiro e participar de sorteios. Ele pergunta se o título de capitalização é um investimento. A resposta correta é:", a: ["Sim, rende mais que a poupança", "Não; é um produto de guarda de dinheiro com sorteios, não um investimento", "Sim, é garantido pelo FGC", "Sim, igual a um CDB"], c: 1, cm: "Capitalização é regulada pela Susep, combina reserva e sorteios e não deve ser apresentada como investimento." },
      { e: "Oferecer um empréstimo somente se o cliente contratar também um seguro caracteriza:", a: ["boa prática comercial", "fidelização", "venda casada, proibida pelo CDC", "portabilidade"], c: 2, cm: "Condicionar o fornecimento de um produto ou serviço à aquisição de outro é venda casada, prática abusiva vedada pelo art. 39 do CDC." },
      { e: "Qual característica é correta sobre o Pix?", a: ["Funciona apenas em dias úteis", "É um sistema de pagamentos instantâneos gerido pelo Banco Central", "Só pode ser usado por pessoas jurídicas", "Exige sempre o número da conta do recebedor"], c: 1, cm: "O Pix é o arranjo de pagamentos instantâneos do Banco Central, disponível 24 horas, todos os dias, e pode usar chaves (CPF, telefone, e-mail, aleatória)." },
      { e: "Antes de recomendar um investimento, é necessário verificar:", a: ["apenas o saldo do cliente", "o perfil do investidor (suitability)", "a idade do gerente", "o horário de atendimento"], c: 1, cm: "A recomendação de investimentos deve ser adequada ao perfil do cliente: objetivos, situação financeira e tolerância a risco." },
      { e: "Sobre o rotativo do cartão de crédito, a orientação mais adequada ao cliente é:", a: ["usar sempre, pois não tem juros", "pagar o mínimo todo mês", "evitar, pois costuma ter juros elevados; pagar o total da fatura sempre que possível", "usar para investir"], c: 2, cm: "O crédito rotativo está entre as modalidades mais caras. A educação financeira do cliente faz parte do atendimento responsável.", uso: "estudo" },
    ],
  },
  {
    ordem: 4, titulo: "Crédito e Financiamentos",
    descricao: "Modalidades de crédito, CET, garantias, consignado e portabilidade.",
    teoria: `Crédito é a disponibilização de recursos que o cliente devolve no futuro, com juros e encargos.

Modalidades comuns:
• Crédito pessoal (sem garantia): juros maiores, pois o risco é maior.
• Crédito consignado: parcelas descontadas direto da folha ou do benefício (aposentados e pensionistas do INSS, servidores, empregados de empresas conveniadas). Juros menores por causa da garantia do desconto. Existe limite de margem consignável definido em lei e normas — confira sempre o percentual vigente.
• Financiamento: crédito com destinação específica (veículo, imóvel, máquinas), geralmente com o próprio bem como garantia (alienação fiduciária).
• Crédito rural: para custeio, investimento e comercialização da produção, com regras do Manual de Crédito Rural (MCR).
• Capital de giro e antecipação de recebíveis: para empresas.

Custo Efetivo Total (CET): é a taxa que reúne juros, tarifas, tributos (como IOF), seguros e demais encargos da operação. Deve ser informado ao cliente antes da contratação, expresso em taxa percentual anual. É o melhor número para comparar propostas.

Portabilidade de crédito: o cliente pode transferir sua dívida para outra instituição que ofereça condições melhores, sem custo de transferência.

Liquidação antecipada: o cliente tem direito de quitar antes e obter redução proporcional dos juros (CDC, art. 52, §2º).

Postura do correspondente: coletar e conferir documentos, explicar condições oficiais, simular nos sistemas autorizados, nunca prometer aprovação e nunca orientar o cliente a omitir ou alterar informações.`,
    resumo: `• CET = juros + tarifas + tributos + seguros + encargos; informar antes de contratar.
• Consignado: desconto em folha/benefício, margem limitada por norma.
• Financiamento: destinação específica, bem em garantia.
• Portabilidade: levar a dívida para outra instituição sem custo de transferência.
• Quitação antecipada com redução proporcional dos juros.
• Nunca prometer aprovação.`,
    questoes: [
      { e: "O indicador que reúne juros, tarifas, tributos, seguros e demais encargos de uma operação de crédito é:", a: ["a taxa Selic", "o Custo Efetivo Total (CET)", "o IPCA", "a taxa nominal"], c: 1, cm: "O CET expressa o custo total da operação para o cliente e deve ser informado antes da contratação. É a forma correta de comparar propostas." },
      { e: "No crédito consignado, as parcelas são:", a: ["pagas por boleto mensal", "descontadas diretamente da folha de pagamento ou do benefício", "pagas somente ao final do contrato", "debitadas no cartão de crédito"], c: 1, cm: "No consignado o desconto é feito na fonte, o que reduz o risco e, em geral, a taxa de juros." },
      { e: "Um cliente quer levar seu empréstimo para outra instituição com juros menores. Esse direito se chama:", a: ["refinanciamento obrigatório", "portabilidade de crédito", "consórcio", "renegociação forçada"], c: 1, cm: "A portabilidade permite transferir a operação de crédito para outra instituição, sem custo de transferência para o cliente." },
      { e: "Ao quitar antecipadamente um contrato de crédito, o consumidor tem direito a:", a: ["pagar multa de 50%", "redução proporcional dos juros e demais acréscimos", "nenhum desconto", "devolução de todas as parcelas já pagas"], c: 1, cm: "O CDC (art. 52, §2º) garante a liquidação antecipada com redução proporcional dos juros e demais acréscimos." },
      { e: "Diante de um cliente ansioso, qual frase é ADEQUADA para o correspondente?", a: ["'Pode ficar tranquilo, seu crédito já está aprovado.'", "'Vou encaminhar sua proposta; a análise e a decisão são do banco.'", "'Se aumentar a renda na ficha, aprova mais rápido.'", "'Com esse seguro, a aprovação é garantida.'"], c: 1, cm: "O correspondente encaminha a proposta e não decide nem promete aprovação. Orientar a alterar dados ou vincular aprovação a outro produto é irregular.", uso: "estudo" },
    ],
  },
  {
    ordem: 5, titulo: "Matemática Financeira",
    descricao: "Juros simples e compostos, taxas equivalentes, SAC, Price e cálculo de parcelas.",
    teoria: `Conceitos básicos:
• Capital (C ou PV): valor inicial. Montante (M ou FV): valor final. Taxa (i): em forma decimal (2% = 0,02). Prazo (n): na mesma unidade da taxa.

Juros simples: o juro incide sempre sobre o capital inicial.
J = C × i × n  e  M = C × (1 + i × n)
Exemplo: R$ 1.000 a 2% ao mês por 3 meses → J = 1.000 × 0,02 × 3 = R$ 60; M = R$ 1.060.

Juros compostos: juro sobre juro.
M = C × (1 + i)^n
Exemplo: R$ 1.000 a 2% ao mês por 3 meses → M = 1.000 × 1,02³ = 1.000 × 1,061208 = R$ 1.061,21.

Taxas equivalentes (compostas): (1 + i_anual) = (1 + i_mensal)^12.
Exemplo: 1% ao mês → (1,01)^12 − 1 ≈ 12,68% ao ano (e não 12%).

Taxa nominal × efetiva: "12% ao ano capitalizados mensalmente" é nominal; a efetiva é 1% ao mês, que equivale a 12,68% ao ano.

Sistemas de amortização:
• SAC (Sistema de Amortização Constante): a amortização é igual em todas as parcelas; os juros caem com o tempo, então as parcelas são decrescentes. Amortização = valor financiado ÷ número de parcelas.
• Price (Tabela Price, sistema francês): parcelas iguais; no começo a maior parte é juros e, com o tempo, aumenta a parte de amortização.
Parcela Price: PMT = PV × i ÷ [1 − (1 + i)^(−n)].

Dica de prova: leia a unidade da taxa e do prazo, converta tudo para a mesma base e faça a conta com calma.`,
    resumo: `• Simples: J = C·i·n. Compostos: M = C·(1+i)^n.
• 1% a.m. composto ≈ 12,68% a.a.
• SAC: amortização constante, parcelas decrescentes.
• Price: parcelas iguais (PMT = PV·i / [1 − (1+i)^−n]).
• Taxa e prazo sempre na mesma unidade.`,
    questoes: [
      { e: "Qual o juro simples de R$ 2.000,00 aplicados a 3% ao mês durante 4 meses?", a: ["R$ 60,00", "R$ 240,00", "R$ 251,02", "R$ 2.240,00"], c: 1, cm: "J = C × i × n = 2.000 × 0,03 × 4 = R$ 240,00. R$ 2.240,00 é o montante, não o juro." },
      { e: "Um capital de R$ 1.000,00 aplicado a juros compostos de 10% ao mês por 2 meses gera montante de:", a: ["R$ 1.200,00", "R$ 1.210,00", "R$ 1.100,00", "R$ 1.020,00"], c: 1, cm: "M = 1.000 × (1,10)² = 1.000 × 1,21 = R$ 1.210,00. Nos juros compostos o juro do 2º mês incide sobre R$ 1.100,00." },
      { e: "No Sistema de Amortização Constante (SAC):", a: ["as parcelas são todas iguais", "a amortização é constante e as parcelas diminuem ao longo do tempo", "os juros aumentam a cada mês", "não há cobrança de juros"], c: 1, cm: "No SAC a amortização é fixa; como o saldo devedor cai, os juros caem e as parcelas são decrescentes." },
      { e: "Na Tabela Price, as parcelas são:", a: ["decrescentes", "crescentes", "iguais (constantes)", "apenas de juros"], c: 2, cm: "Na Price as prestações são iguais; a composição muda: no início mais juros, no fim mais amortização." },
      { e: "Uma taxa de 1% ao mês, em juros compostos, equivale aproximadamente a quanto ao ano?", a: ["12,00%", "12,68%", "10,00%", "13,50%"], c: 1, cm: "(1,01)^12 − 1 ≈ 0,1268 = 12,68% ao ano. Multiplicar por 12 só vale para juros simples.", uso: "estudo" },
    ],
  },
  {
    ordem: 6, titulo: "Ética e Atendimento",
    descricao: "Conduta profissional, direitos do consumidor, atendimento prioritário e comunicação clara.",
    teoria: `O atendimento ético protege o cliente, a instituição e o próprio correspondente.

Princípios:
• Transparência: informar condições, custos (CET), riscos e prazos de forma clara, antes da contratação.
• Adequação: oferecer o que atende à necessidade e à capacidade de pagamento do cliente.
• Respeito e não discriminação: atendimento cordial e igual para todos.
• Confidencialidade: dados do cliente não são comentados nem compartilhados.
• Honestidade: não prometer aprovação, não induzir ao erro, não omitir informações.

Código de Defesa do Consumidor (Lei nº 8.078/1990): aplica-se às instituições financeiras (Súmula 297 do STJ). Garante informação adequada e clara, proteção contra publicidade enganosa e práticas abusivas (como a venda casada) e o direito de arrependimento em contratações feitas fora do estabelecimento (7 dias).

Atendimento prioritário (Lei nº 10.048/2000): pessoas com deficiência, idosos com 60 anos ou mais, gestantes, lactantes, pessoas com crianças de colo, obesos e outros grupos previstos em lei. O Estatuto da Pessoa Idosa também prevê prioridade especial aos maiores de 80 anos.

Superendividamento (Lei nº 14.181/2021): reforça o crédito responsável — avaliar a capacidade de pagamento e não assediar ou pressionar o consumidor, especialmente idosos e pessoas vulneráveis.

Reclamações: o cliente deve ser orientado sobre os canais da instituição (SAC e Ouvidoria) e, se necessário, Banco Central e Procon.`,
    resumo: `• Transparência, adequação, respeito, sigilo e honestidade.
• CDC vale para bancos (Súmula 297 STJ).
• Venda casada e publicidade enganosa são proibidas.
• Prioridade: pessoas com deficiência, 60+, gestantes, lactantes, crianças de colo, obesos.
• Lei do Superendividamento: crédito responsável, sem assédio.
• Orientar SAC e Ouvidoria da instituição.`,
    questoes: [
      { e: "O Código de Defesa do Consumidor se aplica às instituições financeiras?", a: ["Não, bancos têm lei própria", "Sim, conforme entendimento consolidado na Súmula 297 do STJ", "Somente para cartões de crédito", "Somente para clientes pessoa jurídica"], c: 1, cm: "A Súmula 297 do STJ estabelece que o CDC é aplicável às instituições financeiras." },
      { e: "Tem direito a atendimento prioritário, por lei:", a: ["apenas pessoas com mais de 70 anos", "pessoas com deficiência, idosos com 60 anos ou mais, gestantes, lactantes e pessoas com crianças de colo", "somente clientes com conta antiga", "quem chegar com hora marcada"], c: 1, cm: "A Lei nº 10.048/2000 garante prioridade a esses grupos (entre outros previstos em lei)." },
      { e: "Um idoso demonstra dúvida e insegurança sobre um empréstimo. A conduta adequada é:", a: ["insistir para fechar no mesmo dia", "explicar com calma, apresentar custos e parcelas, verificar se cabe no orçamento e respeitar a decisão dele", "preencher a proposta por ele sem explicar", "dizer que a oferta acaba hoje"], c: 1, cm: "Crédito responsável e respeito à vulnerabilidade são exigidos pelo CDC e pela Lei do Superendividamento; pressão e urgência artificial são práticas inadequadas." },
      { e: "Um cliente insatisfeito com a solução do SAC deve ser orientado a procurar:", a: ["a Ouvidoria da instituição", "a polícia", "outro correspondente", "a Receita Federal"], c: 0, cm: "A Ouvidoria atua como segunda instância de atendimento dentro da instituição. Depois, o cliente pode registrar reclamação no Banco Central ou no Procon." },
      { e: "Qual atitude fere a ética no atendimento?", a: ["Explicar o CET antes da contratação", "Comentar com terceiros a situação financeira de um cliente", "Oferecer atendimento prioritário a gestantes", "Indicar a Ouvidoria para reclamações"], c: 1, cm: "Informações financeiras dos clientes são protegidas por sigilo e pela LGPD; comentá-las com terceiros é conduta antiética e ilegal.", uso: "estudo" },
    ],
  },
  {
    ordem: 7, titulo: "LGPD e Sigilo Bancário",
    descricao: "Lei Geral de Proteção de Dados e Lei Complementar nº 105/2001.",
    teoria: `LGPD — Lei nº 13.709/2018
Regula o tratamento de dados pessoais (qualquer operação: coleta, uso, armazenamento, compartilhamento, eliminação).
• Dado pessoal: informação que identifica ou pode identificar uma pessoa (nome, CPF, telefone, endereço).
• Dado pessoal sensível: origem racial ou étnica, convicção religiosa, opinião política, filiação a sindicato, dado de saúde ou vida sexual, dado genético ou biométrico.
• Titular: a pessoa a quem os dados se referem. Controlador: quem toma as decisões sobre o tratamento. Operador: quem trata em nome do controlador. Encarregado (DPO): canal de comunicação com titulares e com a ANPD.
• ANPD: Autoridade Nacional de Proteção de Dados, que fiscaliza e aplica sanções.
• Princípios: finalidade, adequação, necessidade (usar só o mínimo necessário), livre acesso, qualidade, transparência, segurança, prevenção, não discriminação e responsabilização.
• O tratamento precisa de uma base legal (consentimento, cumprimento de obrigação legal, execução de contrato, legítimo interesse, entre outras).

Sigilo bancário — Lei Complementar nº 105/2001
As instituições financeiras devem manter sigilo de suas operações ativas e passivas e dos serviços prestados. O sigilo pode ser afastado apenas nas hipóteses da lei (por exemplo, ordem judicial e comunicações a autoridades em casos previstos).

No dia a dia do correspondente:
• Pedir só os documentos necessários; não fotografar documentos no celular pessoal; não deixar papéis expostos; descartar com segurança.
• Não comentar dados de clientes, nem com familiares do cliente sem autorização.
• Nunca pedir senha, token ou código de segurança.`,
    resumo: `• LGPD = Lei 13.709/2018; fiscalização pela ANPD.
• Dado sensível inclui saúde, biometria, religião, opinião política, origem racial.
• Controlador decide; operador executa; encarregado é o canal.
• Princípio da necessidade: coletar o mínimo.
• Sigilo bancário = LC 105/2001; quebra só nas hipóteses legais.
• Nunca pedir senha.`,
    questoes: [
      { e: "Qual destes é considerado dado pessoal SENSÍVEL pela LGPD?", a: ["Nome completo", "Endereço residencial", "Dado biométrico, como a impressão digital", "Número de telefone"], c: 2, cm: "A LGPD lista como sensíveis, entre outros, dados biométricos, genéticos, de saúde, religião, opinião política e origem racial ou étnica." },
      { e: "O órgão responsável por fiscalizar o cumprimento da LGPD é:", a: ["a ANPD", "a CVM", "o Procon", "o Copom"], c: 0, cm: "A Autoridade Nacional de Proteção de Dados (ANPD) zela pela proteção de dados, fiscaliza e aplica sanções." },
      { e: "O sigilo das operações das instituições financeiras é regulado principalmente:", a: ["pelo CDC", "pela Lei Complementar nº 105/2001", "pela Lei do Pix", "pela Constituição Estadual"], c: 1, cm: "A LC nº 105/2001 dispõe sobre o sigilo das operações das instituições financeiras e as hipóteses em que pode ser afastado." },
      { e: "Na LGPD, quem toma as decisões sobre o tratamento dos dados pessoais é o:", a: ["titular", "operador", "controlador", "encarregado"], c: 2, cm: "O controlador decide sobre o tratamento; o operador trata em nome dele; o encarregado é o canal com titulares e ANPD." },
      { e: "O princípio da NECESSIDADE na LGPD significa:", a: ["coletar o máximo de dados possível", "limitar o tratamento ao mínimo necessário para a finalidade", "pedir consentimento por escrito sempre", "guardar os dados para sempre"], c: 1, cm: "Necessidade = usar só os dados pertinentes, proporcionais e não excessivos para a finalidade. No atendimento: pedir apenas o que é preciso.", uso: "estudo" },
    ],
  },
  {
    ordem: 8, titulo: "Compliance e Prevenção a Fraudes",
    descricao: "Prevenção à lavagem de dinheiro, golpes comuns e controles internos.",
    teoria: `Compliance é estar em conformidade com leis, normas e políticas internas. Para o correspondente, significa seguir os procedimentos da instituição contratante, registrar corretamente e comunicar situações suspeitas.

Prevenção à lavagem de dinheiro (PLD/FT)
• Lei nº 9.613/1998: define o crime de lavagem de dinheiro e as obrigações de identificar clientes, manter registros e comunicar operações suspeitas.
• COAF: Conselho de Controle de Atividades Financeiras — unidade de inteligência financeira que recebe as comunicações.
• Etapas clássicas da lavagem: colocação, ocultação (ou estratificação) e integração.
• Sinais de alerta: incompatibilidade entre a renda e a movimentação, fracionamento de valores para evitar controles, pressa incomum, recusa em fornecer informações, uso de terceiros ("laranjas").
• Conheça seu cliente (KYC): identificar e qualificar o cliente.
• Não avisar o cliente de que a operação será comunicada às autoridades.

Fraudes e golpes comuns
• Falsa central / falso funcionário: ligação pedindo senha, token ou transferência "para proteger a conta".
• Engenharia social: manipulação psicológica para obter dados.
• Documentos falsos ou adulterados: conferir foto, dados, sinais de rasura e consistência.
• Golpe do empréstimo com depósito antecipado: ninguém sério cobra valor adiantado para liberar crédito.

Regras de ouro: nunca pedir ou anotar senhas; conferir documentos originais; desconfiar de urgência; seguir o procedimento da instituição e comunicar suspeitas pelos canais internos.`,
    resumo: `• PLD: Lei 9.613/1998; comunicação ao COAF.
• Etapas: colocação, ocultação, integração.
• Alertas: renda incompatível, fracionamento, pressa, laranjas.
• KYC = conheça seu cliente.
• Não avisar o cliente sobre a comunicação de suspeita.
• Golpes: falsa central, depósito antecipado, documentos falsos.`,
    questoes: [
      { e: "A lei que trata dos crimes de lavagem de dinheiro e do dever de comunicar operações suspeitas é a:", a: ["Lei nº 9.613/1998", "Lei nº 13.709/2018", "Lei nº 8.078/1990", "Lei nº 10.048/2000"], c: 0, cm: "A Lei nº 9.613/1998 tipifica a lavagem de dinheiro e cria obrigações de identificação, registro e comunicação ao COAF." },
      { e: "Quais são as etapas clássicas da lavagem de dinheiro?", a: ["Abertura, movimentação e encerramento", "Colocação, ocultação e integração", "Saque, depósito e transferência", "Proposta, análise e aprovação"], c: 1, cm: "Colocação (inserir o dinheiro no sistema), ocultação (dificultar o rastreio) e integração (aparentar origem lícita)." },
      { e: "Um cliente faz vários depósitos em espécie, um pouco abaixo de um valor de referência, no mesmo dia. Isso é um sinal de:", a: ["organização financeira", "fracionamento, possível tentativa de evitar controles", "investimento seguro", "uso normal da conta"], c: 1, cm: "Fracionar valores para não chamar atenção é um sinal de alerta clássico em PLD e deve seguir o procedimento interno de comunicação." },
      { e: "Uma pessoa liga dizendo ser do banco e pede o código recebido por SMS para 'cancelar uma compra'. Trata-se de:", a: ["procedimento normal", "golpe da falsa central (engenharia social)", "portabilidade", "atualização cadastral"], c: 1, cm: "Bancos não pedem senha, token ou código de segurança. Oriente o cliente a desligar e ligar para o número oficial." },
      { e: "Ao identificar uma operação suspeita, o correspondente deve:", a: ["avisar o cliente de que ele será investigado", "seguir o procedimento interno e comunicar pelos canais da instituição, sem alertar o cliente", "ignorar, porque não é responsabilidade dele", "cancelar a conta do cliente por conta própria"], c: 1, cm: "As comunicações de PLD são sigilosas: o cliente não deve ser avisado. Siga o fluxo interno da instituição contratante.", uso: "estudo" },
    ],
  },
  {
    ordem: 9, titulo: "Legislação aplicável",
    descricao: "Visão geral das principais normas que o correspondente precisa conhecer.",
    teoria: `Quadro-resumo das normas mais cobradas (confira sempre a redação vigente):
• Lei nº 4.595/1964 — Lei do Sistema Financeiro Nacional: cria o CMN e organiza o SFN.
• Resolução CMN nº 4.935/2021 — contratação de correspondentes no País.
• Lei nº 8.078/1990 — Código de Defesa do Consumidor (direito à informação, práticas abusivas, quitação antecipada, arrependimento).
• Lei nº 14.181/2021 — Lei do Superendividamento (crédito responsável, prevenção e tratamento).
• Lei nº 13.709/2018 — LGPD.
• Lei Complementar nº 105/2001 — sigilo bancário.
• Lei nº 9.613/1998 — prevenção à lavagem de dinheiro.
• Lei nº 10.048/2000 — atendimento prioritário.
• Lei nº 10.741/2003 — Estatuto da Pessoa Idosa.
• Lei nº 13.146/2015 — Estatuto da Pessoa com Deficiência (acessibilidade e atendimento).
• Lei nº 10.820/2003 — crédito consignado para empregados (desconto em folha) e regras para beneficiários do INSS (com alterações posteriores).
• Resolução CMN nº 3.517/2007 — informação do Custo Efetivo Total (CET).

Como estudar: ligue cada norma a uma situação do balcão. Exemplo: "o cliente quer quitar antes" → CDC, art. 52 §2º; "pediu para mandar a foto do documento no WhatsApp pessoal" → LGPD e políticas internas.`,
    resumo: `• 4.595/64: SFN e CMN.
• Res. CMN 4.935/21: correspondentes.
• CDC 8.078/90 e Superendividamento 14.181/21.
• LGPD 13.709/18. Sigilo: LC 105/01. PLD: 9.613/98.
• Prioridade: 10.048/00. Idosos: 10.741/03. PcD: 13.146/15.
• CET: Res. CMN 3.517/07.`,
    questoes: [
      { e: "A lei que criou o Conselho Monetário Nacional e estruturou o Sistema Financeiro Nacional é a:", a: ["Lei nº 4.595/1964", "Lei nº 9.613/1998", "Lei nº 13.709/2018", "Lei nº 8.078/1990"], c: 0, cm: "A Lei nº 4.595/1964 (Lei da Reforma Bancária) dispõe sobre o SFN e cria o CMN." },
      { e: "A Lei nº 14.181/2021 trata de:", a: ["Pix", "superendividamento e crédito responsável", "sigilo bancário", "atendimento prioritário"], c: 1, cm: "A Lei do Superendividamento alterou o CDC para prevenir e tratar o superendividamento e reforçar o crédito responsável." },
      { e: "O Estatuto da Pessoa Idosa é a:", a: ["Lei nº 10.741/2003", "Lei nº 13.146/2015", "Lei nº 10.048/2000", "Lei Complementar nº 105/2001"], c: 0, cm: "A Lei nº 10.741/2003 é o Estatuto da Pessoa Idosa. A 13.146/2015 é o Estatuto da Pessoa com Deficiência." },
      { e: "O direito de arrependimento de 7 dias, em contratações fora do estabelecimento comercial, está previsto:", a: ["na LGPD", "no Código de Defesa do Consumidor", "na Lei do Pix", "na Lei de Lavagem de Dinheiro"], c: 1, cm: "O art. 49 do CDC garante o arrependimento em 7 dias para contratações feitas fora do estabelecimento (por telefone, internet, a domicílio)." },
      { e: "Relacione: um cliente quer quitar o empréstimo antes do prazo e pergunta se terá desconto. A norma que garante a redução proporcional dos juros é:", a: ["a LGPD", "o CDC (art. 52, §2º)", "a Lei nº 9.613/1998", "a Lei nº 10.048/2000"], c: 1, cm: "O CDC garante a liquidação antecipada com redução proporcional dos juros e demais acréscimos.", uso: "estudo" },
    ],
  },
];

// Distribui a resposta correta entre A, B, C e D (sem mudar o texto das alternativas)
let _n = 0;
export const MODULOS_ANEPS = MODULOS_BASE.map((m) => ({ ...m, questoes: m.questoes.map((q) => {
  const alvo = (_n++ * 3 + 1) % 4; const certa = q.a[q.c]; const outras = q.a.filter((_, i) => i !== q.c);
  const a = [...outras.slice(0, alvo), certa, ...outras.slice(alvo)];
  return { ...q, a, c: alvo };
}) }));

// Modelo sugerido para o Gerador de Formulários (o administrador pode criar a partir dele)
export const TIPOS_CAMPO = [
  ["texto", "Texto curto"], ["textarea", "Texto longo"], ["cpf", "CPF"], ["rg", "RG"], ["data", "Data"], ["telefone", "Telefone"], ["email", "E-mail"],
  ["endereco", "Endereço"], ["moeda", "Valor em R$"], ["numero", "Número"], ["opcoes", "Lista de opções"], ["assinatura", "Assinatura"], ["secao", "Título de seção"],
];
export const MODELOS_SUGERIDOS = [
  {
    nome: "Ficha cadastral do cliente", descricao: "Dados básicos para atendimento e encaminhamento de propostas.",
    rodape: "Declaro que as informações acima são verdadeiras. Documento gerado no Mais BB Digital — ferramenta de apoio ao atendimento; não é documento oficial do Banco do Brasil.",
    campos: [
      { k: "s1", l: "Dados pessoais", t: "secao" },
      { k: "nome", l: "Nome completo", t: "texto", req: true, largura: "inteira" },
      { k: "cpf", l: "CPF", t: "cpf", req: true }, { k: "rg", l: "RG", t: "rg" },
      { k: "nascimento", l: "Data de nascimento", t: "data" }, { k: "telefone", l: "Telefone", t: "telefone" },
      { k: "email", l: "E-mail", t: "email", largura: "inteira" },
      { k: "endereco", l: "Endereço", t: "endereco", largura: "inteira" },
      { k: "s2", l: "Informações financeiras", t: "secao" },
      { k: "ocupacao", l: "Profissão / ocupação", t: "texto" }, { k: "renda", l: "Renda mensal", t: "moeda" },
      { k: "valor", l: "Valor solicitado", t: "moeda" }, { k: "finalidade", l: "Finalidade", t: "texto" },
      { k: "s3", l: "Complementos", t: "secao" },
      { k: "complementares", l: "Dados complementares", t: "textarea", largura: "inteira" },
      { k: "observacoes", l: "Observações", t: "textarea", largura: "inteira" },
      { k: "ass_cliente", l: "Assinatura do cliente", t: "assinatura" }, { k: "ass_agente", l: "Assinatura do agente", t: "assinatura" },
    ],
  },
  {
    nome: "Declaração de atendimento", descricao: "Comprovante simples de que o cliente foi atendido e orientado.",
    rodape: "Declaração gerada no Mais BB Digital — ferramenta de apoio ao atendimento do correspondente; não substitui comprovantes oficiais da instituição.",
    campos: [
      { k: "nome", l: "Nome do cliente", t: "texto", req: true, largura: "inteira" }, { k: "cpf", l: "CPF", t: "cpf" }, { k: "data", l: "Data do atendimento", t: "data" },
      { k: "servico", l: "Serviço / assunto", t: "texto", largura: "inteira" },
      { k: "orientacao", l: "Orientações prestadas", t: "textarea", largura: "inteira" },
      { k: "ass_cliente", l: "Assinatura do cliente", t: "assinatura" }, { k: "ass_agente", l: "Assinatura do agente", t: "assinatura" },
    ],
  },
];
