// =============================================================================
// SALA DO EMPREENDEDOR — IDEIAS PARA CADA MÊS
// Para cada mês: datas e temas, ações da Sala, ideias para o comerciante
// (vendas e marketing), lembretes do MEI e uma mensagem pronta para divulgar.
// Datas móveis (Carnaval, Páscoa, Dia das Mães, Dia dos Pais, Black Friday)
// estão descritas pela regra, não pelo dia: confira no calendário do ano.
// =============================================================================

export const IDEIAS_MES = [
  {
    mes: 1, nome: "Janeiro", emoji: "🎆", tema: "Planejamento do ano e liquidação",
    datas: ["Confraternização Universal (1º)", "Férias escolares", "Janeiro Branco (saúde mental)", "Contas do começo do ano (IPVA, IPTU, material escolar)"],
    sala: [
      "Oficina 'Planeje seu ano em 1 hora': metas de vendas, calendário de datas e reserva para os meses fracos",
      "Mutirão 'MEI em dia': consultar DAS atrasado e parcelar antes que vire dívida ativa",
      "Enviar o calendário do ano (PDF) para todos os comerciantes do Conecta Comércio",
      "Conversar com quem vendeu bem no Natal: o que funcionou e o que repetir",
    ],
    comerciante: [
      "Liquidação de verão para girar o estoque parado do fim de ano",
      "Lista de material escolar entregue separada (papelarias e variedades)",
      "Promoção para quem está de férias: combos família, delivery, pacotes de serviço",
      "Revisar preços de todos os produtos com os aumentos dos fornecedores",
    ],
    mei: ["DAS vence todo dia 20", "Começar a separar as notas e o faturamento do ano anterior para a Declaração Anual (até 31 de maio)"],
    mensagem: "🎆 Ano novo, negócio organizado! A Sala do Empreendedor ajuda você a planejar o novo ano: metas, calendário de vendas e MEI em dia. Agende seu atendimento gratuito.",
  },
  {
    mes: 2, nome: "Fevereiro", emoji: "🎒", tema: "Volta às aulas e Carnaval",
    datas: ["Volta às aulas", "Carnaval (data móvel: fevereiro ou março)", "Começo do prazo da Declaração Anual do MEI"],
    sala: [
      "Abrir o Mutirão da DASN-SIMEI com horários extras na agenda",
      "Divulgar cursos gratuitos do Sebrae do primeiro semestre",
      "Visitar 5 comércios para atualizar o cadastro no Conecta Comércio (fotos, horário, WhatsApp)",
    ],
    comerciante: [
      "Kit volta às aulas: mochila + estojo + material com preço fechado",
      "Uniforme, calçado escolar e corte de cabelo 'volta às aulas' em parceria entre lojas",
      "Lanche escolar e marmita para professores e funcionários das escolas",
      "Carnaval: fantasias, adereços, bebidas e petiscos; avisar o horário de funcionamento no feriado",
    ],
    mei: ["DASN-SIMEI aberta: quanto antes declarar, menos fila", "DAS vence dia 20"],
    mensagem: "🎒 Volta às aulas com o comércio de Ivatuba! Material, uniforme, calçados e lanche perto de casa. E MEI: a Declaração Anual já está aberta — a Sala faz com você.",
  },
  {
    mes: 3, nome: "Março", emoji: "🌷", tema: "Mês da mulher e do consumidor",
    datas: ["Dia Internacional da Mulher (8)", "Dia do Consumidor (15)", "Começa o outono (por volta de 20)", "Páscoa às vezes cai no fim de março ou em abril"],
    sala: [
      "Encontro 'Mulheres que empreendem' com histórias de empreendedoras de Ivatuba",
      "Seguir com o mutirão da Declaração Anual do MEI",
      "Orientar sobre direitos do consumidor: troca, garantia, preço visível",
    ],
    comerciante: [
      "Semana do Consumidor (em torno do dia 15) com descontos reais e brindes",
      "Homenagem às clientes no Dia da Mulher: mimo, sorteio ou serviço de beleza com desconto",
      "Encomendas de Páscoa abertas: ovos caseiros, cestas e chocolates",
      "Coleção outono-inverno começa a chegar: divulgar novidades",
    ],
    mei: ["DASN-SIMEI até 31 de maio", "DAS vence dia 20"],
    mensagem: "🌷 Março é das mulheres que empreendem e do consumidor! Aproveite a Semana do Consumidor no comércio de Ivatuba — ofertas no Conecta Comércio.",
  },
  {
    mes: 4, nome: "Abril", emoji: "🐣", tema: "Páscoa e preparação para o Dia das Mães",
    datas: ["Páscoa (data móvel: março ou abril)", "Tiradentes (21)", "45 dias antes do Dia das Mães"],
    sala: [
      "Avisar os comerciantes: o Dia das Mães é a segunda melhor data do ano — planejar estoque agora",
      "Oficina de foto de produto com celular para divulgação nas redes",
      "Reforçar o mutirão da Declaração Anual: falta 1 mês",
    ],
    comerciante: [
      "Páscoa: ovos e cestas sob encomenda com sinal; kits para empresas presentearem funcionários",
      "Começar a divulgação do Dia das Mães com antecedência (kits e lista de presentes)",
      "Salões e estética: abrir agenda do Dia das Mães e vender vale-presente",
      "Feriado: avisar o horário de funcionamento e ter delivery",
    ],
    mei: ["Faltam 30 dias para o fim do prazo da DASN-SIMEI", "DAS vence dia 20"],
    mensagem: "🐣 Feliz Páscoa com o sabor de Ivatuba! Encomende ovos, cestas e chocolates dos produtores e comércios da cidade. Veja no Conecta Comércio.",
  },
  {
    mes: 5, nome: "Maio", emoji: "💐", tema: "Dia das Mães e prazo do MEI",
    datas: ["Dia do Trabalhador (1º)", "Dia das Mães (2º domingo)", "Maio Amarelo (trânsito)", "Fim do prazo da DASN-SIMEI (31)"],
    sala: [
      "Última chamada da Declaração Anual: chamar no WhatsApp todos os MEIs que ainda não declararam",
      "Campanha 'Presente de mãe se compra em Ivatuba' com os comerciantes",
      "Registrar a quantidade de declarações feitas (bom para o relatório e o Selo Sebrae)",
    ],
    comerciante: [
      "Dia das Mães: kits prontos por faixa de preço, embrulho caprichado e entrega",
      "Sorteio entre clientes da semana (com regras claras) para movimentar a loja",
      "Restaurantes: reservas e almoço especial no domingo; padarias: café da manhã das mães",
      "Depois da data: agradecer os clientes e convidar para voltar",
    ],
    mei: ["DASN-SIMEI até 31 de maio (depois disso tem multa)", "DAS vence dia 20"],
    mensagem: "💐 Presente de mãe se compra em Ivatuba! Flores, roupas, beleza, doces e muito carinho no comércio da cidade. E MEI: a Declaração Anual vence em 31 de maio!",
  },
  {
    mes: 6, nome: "Junho", emoji: "🌽", tema: "Dia dos Namorados e festas juninas",
    datas: ["Dia dos Namorados (12)", "Santo Antônio (13), São João (24), São Pedro (29)", "Começa o inverno (por volta de 21)", "Fim do primeiro semestre"],
    sala: [
      "Balanço do 1º semestre: atendimentos, metas e pontos do Selo Sebrae",
      "Apoio a barracas e feirantes nas festas juninas (cadastro, Pix, organização de preços)",
      "Orientar sobre o limite de faturamento do MEI: somar o que já vendeu no ano",
    ],
    comerciante: [
      "Dia dos Namorados: jantar a dois, kits de presente, sessão de fotos, perfume e roupas",
      "Festa junina: comidas típicas por encomenda, roupas caipiras, decoração",
      "Liquidação de inverno ou promoção de agasalhos e cobertores",
      "Barracas: tabela de preços visível, troco e QR Code do Pix",
    ],
    mei: ["Conferir o faturamento do semestre em relação ao limite anual", "DAS vence dia 20"],
    mensagem: "🌽 Arraiá do comércio de Ivatuba! Comidas típicas, roupas caipiras e presentes para o Dia dos Namorados perto de você. Veja as ofertas no Conecta Comércio.",
  },
  {
    mes: 7, nome: "Julho", emoji: "❄️", tema: "Férias de inverno, Dia do Comerciante e dos Avós",
    datas: ["Férias escolares de inverno", "Dia do Comerciante (16)", "Dia dos Avós (26)", "Dia do Agricultor (28)", "45 dias antes do Dia dos Pais"],
    sala: [
      "Homenagem no Dia do Comerciante: post nas redes com fotos dos comerciantes da cidade",
      "Encontro com produtores rurais no Dia do Agricultor: crédito, feira e compras públicas",
      "Avisar os comerciantes para se prepararem para o Dia dos Pais",
    ],
    comerciante: [
      "Férias: programação para crianças, combos família e delivery",
      "Dia dos Avós: café especial, presentes e homenagens nas redes",
      "Liquidação de inverno para abrir espaço para a coleção nova",
      "Começar a divulgar o Dia dos Pais (kits, ferramentas, roupas, churrasco)",
    ],
    mei: ["DAS vence dia 20", "Bom momento para regularizar parcelas atrasadas"],
    mensagem: "🛍️ 16 de julho é Dia do Comerciante! Obrigado a quem gera emprego e movimenta Ivatuba. Valorize: compre no comércio local.",
  },
  {
    mes: 8, nome: "Agosto", emoji: "👔", tema: "Dia dos Pais e reorganização do segundo semestre",
    datas: ["Dia dos Pais (2º domingo)", "Dia do Estudante (11)", "Mês de editais e compras públicas em muitas prefeituras"],
    sala: [
      "Campanha 'Presente de pai se compra em Ivatuba'",
      "Oficina sobre compras públicas: certidões, cadastro de fornecedor e editais abertos",
      "Revisar com os comerciantes as metas do 2º semestre (rumo ao Natal)",
    ],
    comerciante: [
      "Dia dos Pais: kits de churrasco, ferramentas, roupas, barbearia e vale-presente",
      "Almoço do Dia dos Pais com reserva antecipada",
      "Planejar a compra do Natal: negociar prazos com fornecedores agora",
      "Material de construção e serviços: começa a época seca, boa para obras e pintura",
    ],
    mei: ["DAS vence dia 20", "Certidões em dia para vender para a prefeitura"],
    mensagem: "👔 Presente de pai se compra em Ivatuba! Roupas, ferramentas, churrasco e barbearia no comércio da cidade. Veja as ofertas no Conecta Comércio.",
  },
  {
    mes: 9, nome: "Setembro", emoji: "🌸", tema: "Dia do Cliente e primavera",
    datas: ["Independência do Brasil (7)", "Dia do Cliente (15)", "Começa a primavera (por volta de 22)", "Setembro Amarelo (valorização da vida)"],
    sala: [
      "Campanha do Dia do Cliente com todos os comerciantes do Conecta Comércio",
      "Oficina de atendimento: como encantar e fidelizar o cliente",
      "Começar a preparar o Natal: capital de giro e crédito para estoque (Fomento Paraná)",
    ],
    comerciante: [
      "Dia do Cliente: agradecer com brinde, desconto ou cartão fidelidade",
      "Coleção primavera-verão: vitrine nova e fotos nas redes",
      "Jardinagem, flores e decoração na chegada da primavera",
      "Pedir avaliação no Google para os clientes satisfeitos",
    ],
    mei: ["DAS vence dia 20", "Planejar o crédito para o estoque de fim de ano com antecedência"],
    mensagem: "🌸 15 de setembro é Dia do Cliente! Os comerciantes de Ivatuba agradecem a sua preferência — confira as surpresas no Conecta Comércio.",
  },
  {
    mes: 10, nome: "Outubro", emoji: "🧸", tema: "Dia das Crianças, empreendedorismo e começo do Natal",
    datas: ["Dia Nacional da Micro e Pequena Empresa (5)", "Dia das Crianças (12)", "Dia do Professor (15)", "Outubro Rosa", "Halloween (31)"],
    sala: [
      "Semana do Empreendedor (em torno do dia 5): palestras, atendimento estendido e feira",
      "Lançar a campanha de Natal com os comerciantes (concurso Meu Comércio Iluminado)",
      "Orientar sobre capital de giro para o estoque de Natal",
    ],
    comerciante: [
      "Dia das Crianças: brinquedos, roupas, festa na loja e combos para a família",
      "Dia do Professor: kits de presente para escolas comprarem",
      "Outubro Rosa: ação de conscientização e parte das vendas para uma causa local",
      "Comprar o estoque de Natal e planejar a decoração da loja",
    ],
    mei: ["DAS vence dia 20", "Conferir o faturamento do ano em relação ao limite do MEI"],
    mensagem: "🧸 Dia das Crianças no comércio de Ivatuba! Brinquedos, roupas e diversão perto de casa. E comerciante: a Sala do Empreendedor já está planejando o Natal com você.",
  },
  {
    mes: 11, nome: "Novembro", emoji: "🛍️", tema: "Black Friday e 13º salário",
    datas: ["Finados (2)", "Proclamação da República (15)", "Novembro Azul (saúde do homem)", "Dia da Consciência Negra (20)", "Black Friday (última sexta-feira)", "1ª parcela do 13º salário (até 30)"],
    sala: [
      "Orientar sobre Black Friday honesta: desconto real, preço anterior visível",
      "Lembrar o comerciante que emprega: 1ª parcela do 13º até 30 de novembro",
      "Divulgar o concurso Meu Comércio Iluminado e a votação pública",
    ],
    comerciante: [
      "Black Friday local: 'Black Friday de Ivatuba' com todos os comércios no mesmo fim de semana",
      "Aproveitar o 13º dos clientes: crediário com controle, parcelamento no cartão e combos",
      "Decoração de Natal pronta até o fim do mês (vitrine e fachada)",
      "Encomendas de Natal abertas: panetones, cestas e presentes corporativos",
    ],
    mei: ["DAS vence dia 20", "Juntar as notas do ano para a próxima Declaração Anual"],
    mensagem: "🛍️ Black Friday de Ivatuba! Descontos de verdade no comércio da cidade, sem frete e com atendimento de quem você conhece. Veja as ofertas no Conecta Comércio.",
  },
  {
    mes: 12, nome: "Dezembro", emoji: "🎄", tema: "Natal, fim de ano e balanço",
    datas: ["2ª parcela do 13º salário (até 20)", "Natal (25)", "Réveillon (31)", "Férias escolares e coletivas"],
    sala: [
      "Campanha 'Natal em Ivatuba: compre aqui' com todos os comerciantes",
      "Resultado do concurso Meu Comércio Iluminado",
      "Balanço do ano: relatório de atendimentos (Excel e PDF), metas atingidas e evidências do Selo",
      "Planejar o calendário do ano seguinte",
    ],
    comerciante: [
      "Horário estendido no Natal e comunicação clara dos horários de feriado",
      "Presente rápido: kits prontos, vale-presente e embrulho grátis",
      "Ceia e confraternização: encomendas de carnes, doces, salgados e bebidas",
      "Agradecer os clientes do ano e divulgar o que vem em janeiro",
    ],
    mei: ["DAS vence dia 20", "Fechar o faturamento do ano para a DASN-SIMEI", "Quem emprega: 2ª parcela do 13º até 20 de dezembro"],
    mensagem: "🎄 Este Natal, compre em Ivatuba! Cada compra no comércio local gera emprego e renda para a nossa cidade. Boas festas e um próspero ano novo!",
  },
];
