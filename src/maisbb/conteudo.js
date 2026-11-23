// =============================================================================
// MAIS BB DIGITAL — conteúdo de apoio comercial (sugestões de relacionamento).
// Nada aqui é informação bancária oficial: produtos, taxas, limites, prazos,
// convênios e critérios vêm SOMENTE da Biblioteca de Serviços, cadastrada pelo
// administrador a partir dos canais oficiais do Banco do Brasil.
// =============================================================================

export const CATEGORIAS_SERVICO = [
  "Serviços bancários autorizados", "Pagamentos e recebimentos", "Serviços para pessoa física", "Serviços para pessoa jurídica",
  "Crédito", "Empréstimos", "Financiamentos", "Serviços para produtores rurais", "Outros serviços disponíveis ao correspondente",
];

export const CATEGORIAS_ATENDIMENTO = {
  bancario: "Atendimento bancário", pagamentos: "Pagamentos", credito: "Crédito", financiamento: "Financiamento", orientacao: "Orientação",
  pf: "Pessoa física", pj: "Pessoa jurídica", rural: "Atendimento rural", documentacao: "Documentação", outros: "Outros",
};
export const RESULTADOS = { concluido: "Concluído", orientado: "Orientado", encaminhado: "Encaminhado", aguardando: "Aguardando retorno", nao_concluido: "Não concluído" };
export const COR_RESULTADO = { concluido: "#16A34A", orientado: "#0A5AA8", encaminhado: "#7C3AED", aguardando: "#D97706", nao_concluido: "#B4462F" };
export const OPORTUNIDADE = { nova: "Nova", interessado: "Interessado", em_atendimento: "Em atendimento", convertida: "Convertida", sem_interesse: "Sem interesse" };
export const ORIGENS = { balcao: "Atendimento no balcão", indicacao: "Indicação", whatsapp: "WhatsApp", telefone: "Telefone", redes: "Redes sociais", evento: "Evento", visita: "Visita/prospecção", campanha: "Campanha", outro: "Outro" };
export const TIPOS_PROSPECCAO = { presencial: "Presencial", whatsapp: "WhatsApp", telefone: "Telefone", redes: "Redes sociais", evento: "Eventos", visita: "Visitas comerciais", parceria: "Parcerias institucionais autorizadas" };
export const CATEGORIAS_LOCAL = ["Comércios", "Empresas", "Escolas", "Escritórios", "Prestadores de serviços", "Associações", "Comunidades", "Produtores rurais", "Eventos municipais", "Grupos comunitários"];

// ------------------------------------------------------------------ PÚBLICOS
// Cada grupo tem um conteúdo-base; cada subcategoria ajusta perfil e onde encontrar.
const G = {
  aposentados: {
    nome: "Aposentados e pensionistas", emoji: "👵",
    necessidades: ["Receber e organizar o benefício com segurança", "Pagar contas sem filas e sem deslocamentos longos", "Entender canais e evitar golpes", "Planejar o orçamento da família"],
    perguntas: ["Como o(a) senhor(a) costuma pagar suas contas hoje?", "Tem alguém da família que ajuda com os assuntos do banco?", "Já recebeu alguma ligação ou mensagem estranha pedindo dados?", "O que seria mais prático para o seu dia a dia?"],
    servicos: ["Pagamentos e recebimentos", "Serviços para pessoa física", "Serviços bancários autorizados"],
    apresentar: "Fale devagar, com clareza e sem termos técnicos. Mostre que o correspondente fica perto de casa e que a atendente explica tudo com calma. Reforce segurança: o correspondente nunca pede senha.",
    faq: ["Posso resolver aqui sem ir até a agência? → Explique apenas os serviços cadastrados na biblioteca como disponíveis no correspondente.", "Vocês ligam pedindo senha? → Nunca. Oriente a desligar e procurar o atendimento oficial."],
    acompanhamento: "Retorno gentil em 7 dias para saber se ficou alguma dúvida; convite para palestras de segurança contra golpes.",
    campanhas: ["Semana do Aposentado (24/01)", "Segurança contra golpes", "Pagamentos sem fila"],
    meta: "10 contatos e 3 atendimentos orientados por semana",
  },
  professores: {
    nome: "Professores", emoji: "🧑‍🏫",
    necessidades: ["Praticidade para pagar contas e organizar o salário", "Pouco tempo livre durante o expediente", "Planejamento de gastos de início de ano letivo"],
    perguntas: ["Qual o melhor horário para você resolver assuntos do banco?", "Você prefere atendimento presencial ou mensagem?", "Tem algum plano para este ano em que eu possa orientar?"],
    servicos: ["Serviços para pessoa física", "Pagamentos e recebimentos", "Crédito"],
    apresentar: "Seja objetiva e respeite o tempo. Ofereça atendimento agendado em horário de intervalo ou após as aulas.",
    faq: ["Posso agendar um horário? → Sim, combine pelo WhatsApp e registre na agenda."],
    acompanhamento: "Mensagem curta após o atendimento e lembrete em datas como volta às aulas e Dia do Professor.",
    campanhas: ["Volta às Aulas", "Dia do Professor (15/10)"],
    meta: "1 escola visitada (com autorização da direção) por mês",
  },
  servidores: {
    nome: "Funcionários públicos", emoji: "🏛️",
    necessidades: ["Organizar finanças pessoais", "Agilidade em pagamentos", "Informação clara sobre serviços disponíveis"],
    perguntas: ["Como você organiza os pagamentos do mês?", "Qual serviço do banco você mais usa?", "Prefere ser atendido(a) com hora marcada?"],
    servicos: ["Serviços para pessoa física", "Pagamentos e recebimentos", "Crédito"],
    apresentar: "Linguagem institucional e objetiva. Nunca presuma condições especiais pelo vínculo: oriente a consultar os canais oficiais.",
    faq: ["Servidor tem alguma condição diferente? → Só informe o que estiver cadastrado na biblioteca com fonte oficial; caso contrário, oriente a consultar o canal oficial."],
    acompanhamento: "Contato no início do mês e em datas institucionais (Dia do Servidor Público, 28/10).",
    campanhas: ["Dia do Servidor Público (28/10)"],
    meta: "2 ações de relacionamento por mês com órgãos públicos (com autorização)",
  },
  trabalhadores: {
    nome: "Trabalhadores", emoji: "👷",
    necessidades: ["Pagar contas perto do trabalho", "Atendimento rápido no horário de almoço", "Orientação financeira básica"],
    perguntas: ["Qual horário é mais fácil para você passar aqui?", "Você paga suas contas como hoje?", "Tem alguma dúvida sobre serviços do banco?"],
    servicos: ["Pagamentos e recebimentos", "Serviços para pessoa física"],
    apresentar: "Atendimento rápido e prático; destaque o horário de funcionamento e a localização.",
    faq: ["Atende no horário de almoço? → Informe o horário oficial da unidade (configurado no sistema)."],
    acompanhamento: "Divulgação em grupos e murais de empresas parceiras (com autorização).",
    campanhas: ["Dia do Trabalhador (1/5)", "Pagamentos rápidos"],
    meta: "1 empresa parceira por mês para divulgação autorizada",
  },
  empreendedores: {
    nome: "Empreendedores", emoji: "🧑‍💼",
    necessidades: ["Receber e pagar com agilidade", "Separar contas pessoais e do negócio", "Orientação sobre serviços para empresas"],
    perguntas: ["Como você recebe dos seus clientes hoje?", "Você separa a conta pessoal da conta do negócio?", "O que mais toma seu tempo com banco?"],
    servicos: ["Serviços para pessoa jurídica", "Pagamentos e recebimentos", "Crédito"],
    apresentar: "Mostre praticidade e economia de tempo. Seja comercial, mas sem pressão: entenda a rotina do negócio primeiro.",
    faq: ["MEI pode ser atendido aqui? → Informe apenas os serviços PJ cadastrados na biblioteca como disponíveis ao correspondente."],
    acompanhamento: "Visita de relacionamento a cada 60 dias; convite para eventos da associação comercial.",
    campanhas: ["Dia do Comerciante (16/7)", "Dia do Cliente (15/9)"],
    meta: "8 estabelecimentos visitados por mês",
  },
  rurais: {
    nome: "Produtores rurais", emoji: "🌾",
    necessidades: ["Resolver assuntos do banco sem perder o dia de trabalho", "Orientação sobre serviços para o produtor", "Pagamentos ligados à safra"],
    perguntas: ["Qual a melhor época do ano para conversarmos?", "Que serviço do banco você mais precisa?", "Você vem à cidade em quais dias?"],
    servicos: ["Serviços para produtores rurais", "Pagamentos e recebimentos", "Financiamentos"],
    apresentar: "Linguagem simples e respeitosa, falando a língua do campo. Respeite o calendário agrícola.",
    faq: ["Correspondente atende produtor rural? → Informe apenas o que estiver cadastrado na biblioteca com fonte oficial; para o restante, indique o canal oficial."],
    acompanhamento: "Contato antes do plantio e da colheita; presença em eventos do sindicato e cooperativas (com autorização).",
    campanhas: ["Dia do Agricultor (28/7)", "Planejamento da safra"],
    meta: "1 ação em associação, cooperativa ou sindicato por mês",
  },
  outros: {
    nome: "Outros públicos", emoji: "👥",
    necessidades: ["Conhecer o correspondente e seus serviços", "Atendimento próximo e acolhedor", "Educação financeira"],
    perguntas: ["Você já conhecia o correspondente Mais BB?", "Que serviço seria útil para você?", "Como prefere receber informações?"],
    servicos: ["Serviços para pessoa física", "Pagamentos e recebimentos", "Serviços bancários autorizados"],
    apresentar: "Seja acolhedora; apresente o correspondente como ponto de atendimento próximo, sem prometer o que não está cadastrado.",
    faq: ["O que é um correspondente? → Ponto de atendimento autorizado que presta serviços definidos pelo banco; consulte a biblioteca para saber quais."],
    acompanhamento: "Mensagem de boas-vindas e convite para conhecer a unidade.",
    campanhas: ["Conheça o Mais BB", "Educação financeira em família"],
    meta: "15 novos contatos por mês",
  },
};

const SUB = [
  ["aposentados", "inss", "Aposentados do INSS", "Recebe benefício do INSS e valoriza atendimento próximo e paciente.", ["Grupos de terceira idade", "Igrejas e pastorais", "Associações de aposentados", "Farmácias e mercados no início do mês"]],
  ["aposentados", "pensionistas", "Pensionistas", "Recebe pensão e muitas vezes cuida sozinho(a) das finanças da casa.", ["Grupos de convivência", "Igrejas", "Indicação de familiares"]],
  ["aposentados", "apos-publico", "Aposentados do setor público", "Servidor aposentado, costuma ter rotina financeira organizada.", ["Associações de servidores aposentados", "Eventos municipais"]],
  ["aposentados", "apos-privado", "Aposentados do setor privado", "Trabalhou no setor privado e busca praticidade.", ["Grupos de terceira idade", "Comércio local"]],
  ["professores", "prof-municipal", "Professores municipais", "Atua na rede municipal de ensino.", ["Escolas municipais (com autorização da direção)", "Eventos da Secretaria de Educação"]],
  ["professores", "prof-estadual", "Professores estaduais", "Atua na rede estadual.", ["Colégios estaduais (com autorização)", "Associações de professores"]],
  ["professores", "prof-federal", "Professores federais", "Atua em instituição federal.", ["Instituições federais da região (com autorização)"]],
  ["professores", "prof-particular", "Professores particulares", "Atua em escolas particulares ou dá aulas particulares.", ["Escolas particulares", "Redes sociais", "Indicação"]],
  ["professores", "prof-aposentado", "Professores aposentados", "Professor(a) aposentado(a), costuma ser referência na comunidade.", ["Associações de professores aposentados", "Igrejas e grupos comunitários"]],
  ["servidores", "serv-municipal", "Servidores municipais", "Trabalha na prefeitura ou em órgãos municipais.", ["Prefeitura e secretarias (com autorização)", "Unidades de saúde"]],
  ["servidores", "serv-estadual", "Servidores estaduais", "Trabalha em órgãos estaduais na cidade.", ["Órgãos estaduais locais (com autorização)"]],
  ["servidores", "serv-federal", "Servidores federais", "Trabalha em órgãos federais.", ["Órgãos federais da região (com autorização)"]],
  ["servidores", "serv-aposentado", "Servidores aposentados", "Servidor público aposentado.", ["Associações de servidores", "Grupos de terceira idade"]],
  ["trabalhadores", "clt", "Funcionários CLT", "Empregado com carteira assinada.", ["Empresas parceiras (divulgação autorizada)", "Horário de almoço no centro"]],
  ["trabalhadores", "comercio", "Trabalhadores do comércio", "Trabalha em lojas e mercados.", ["Comércio do centro", "Associação comercial"]],
  ["trabalhadores", "industria", "Trabalhadores da indústria", "Trabalha em indústrias da região.", ["Empresas da região (com autorização do RH)"]],
  ["trabalhadores", "saude", "Profissionais da saúde", "Trabalha em unidades de saúde, farmácias e clínicas.", ["Unidades de saúde e clínicas (com autorização)"]],
  ["trabalhadores", "prestadores", "Prestadores de serviços", "Presta serviços de forma autônoma ou em empresas.", ["Grupos de serviços", "Indicações"]],
  ["empreendedores", "mei", "MEI", "Microempreendedor individual que cuida de tudo sozinho.", ["Sala do Empreendedor", "Feiras", "Comércio de bairro"]],
  ["empreendedores", "micro", "Microempresários", "Dono de pequeno negócio com poucos funcionários.", ["Associação comercial", "Centro comercial"]],
  ["empreendedores", "comerciantes", "Comerciantes", "Lojista ou dono de mercado, farmácia, etc.", ["Visitas no comércio (horário de menor movimento)"]],
  ["empreendedores", "liberais", "Profissionais liberais", "Advogados, contadores, dentistas, etc.", ["Escritórios e consultórios (com agendamento)"]],
  ["empreendedores", "autonomos", "Autônomos", "Trabalha por conta própria.", ["Grupos de WhatsApp da cidade", "Indicações"]],
  ["empreendedores", "pequenos", "Pequenos empresários", "Empresa em crescimento.", ["Associação comercial", "Eventos empresariais"]],
  ["rurais", "agricultores", "Agricultores", "Produz grãos, hortaliças ou frutas.", ["Cooperativas", "Sindicato rural", "Agropecuárias"]],
  ["rurais", "pecuaristas", "Pecuaristas", "Cria gado de corte ou outros animais.", ["Sindicato rural", "Leilões e eventos do setor"]],
  ["rurais", "leite", "Produtores de leite", "Entrega leite para laticínios.", ["Laticínios e linhas de leite (com autorização)"]],
  ["rurais", "familiar", "Agricultura familiar", "Família que produz e vende direto.", ["Feiras do produtor", "Associações", "IDR-Paraná/Emater"]],
  ["rurais", "pequenos-produtores", "Pequenos produtores", "Pequena propriedade com atividades diversificadas.", ["Comunidades rurais", "Igrejas do interior"]],
  ["outros", "jovens", "Jovens", "Primeiro emprego ou primeiros passos financeiros.", ["Escolas e cursos (com autorização)", "Redes sociais"]],
  ["outros", "universitarios", "Universitários", "Estudante de faculdade presencial ou EAD.", ["Polos EAD", "Redes sociais"]],
  ["outros", "mulheres", "Mulheres", "Mulheres que cuidam das finanças da casa ou empreendem.", ["Grupos de mulheres", "Eventos do Dia da Mulher"]],
  ["outros", "familias", "Famílias", "Famílias que organizam o orçamento juntas.", ["Escolas", "Igrejas", "Eventos comunitários"]],
  ["outros", "novos-moradores", "Novos moradores", "Chegou recentemente à cidade.", ["Indicações", "Grupos da cidade nas redes"]],
  ["outros", "nao-conhecem", "Quem ainda não conhece o correspondente", "Nunca usou os serviços do Mais BB.", ["Eventos municipais", "Comércio local", "Redes sociais"]],
];

export const GRUPOS = Object.fromEntries(Object.entries(G).map(([k, v]) => [k, { nome: v.nome, emoji: v.emoji }]));
export const PUBLICOS_BASE = SUB.map(([g, chave, nome, perfil, onde]) => {
  const b = G[g];
  return {
    chave, grupo: g, nome, personalizado: false,
    conteudo: {
      perfil, necessidades: b.necessidades, onde, perguntas: b.perguntas, servicos: b.servicos,
      inicio: `Olá! Sou a atendente do Mais BB Correspondente Autorizado aqui de Ivatuba. Estou conversando com ${nome.toLowerCase()} para apresentar o nosso ponto de atendimento. Posso te explicar rapidinho como podemos ajudar?`,
      apresentar: b.apresentar, faq: b.faq,
      mensagens: [
        `Olá! 😊 Aqui é do Mais BB Correspondente Autorizado de Ivatuba. Queremos convidar você a conhecer nosso ponto de atendimento. Estamos à disposição para orientar sobre os serviços disponíveis. Posso ajudar?`,
        `Bom dia! Lembrando que o Mais BB de Ivatuba está pertinho de você. Se precisar de orientação, é só chamar aqui ou passar na unidade. 💛💙`,
      ],
      acompanhamento: b.acompanhamento, campanhas: b.campanhas, meta: b.meta,
    },
  };
});
export const SECOES_PUBLICO = [
  ["perfil", "1. Perfil do público"], ["necessidades", "2. Necessidades que podem ser identificadas"], ["onde", "3. Onde encontrar esse público"],
  ["inicio", "4. Como iniciar uma conversa"], ["perguntas", "5. Perguntas para entender as necessidades"], ["servicos", "6. Serviços autorizados potencialmente relevantes"],
  ["apresentar", "7. Como apresentar o serviço"], ["faq", "8. Dúvidas frequentes"], ["mensagens", "9. Mensagens prontas"],
  ["acompanhamento", "10. Estratégias de acompanhamento"], ["campanhas", "11. Campanhas recomendadas"], ["meta", "12. Meta de prospecção"],
];

// ------------------------------------------------------------------ CALENDÁRIO COMERCIAL (12 meses)
const M = (tema, publico, objetivo, principal, secundarias, servicos, estrategias, datas, presenciais, digitais, mensagem, artes, metas, indicadores) =>
  ({ tema, publico, objetivo, principal, secundarias, servicos, estrategias, datas, presenciais, digitais, mensagem, artes, metas, indicadores });
export const MESES_PADRAO = {
  1: M("Ano novo, contas em dia", "Aposentados e pensionistas", "Apresentar o correspondente para quem organiza as contas do ano", "Semana do Aposentado", ["Contas do início do ano", "Segurança contra golpes"], ["Pagamentos e recebimentos"], ["Visitar grupos de terceira idade", "Palestra rápida sobre golpes"], ["24/01 · Dia do Aposentado"], ["Café com aposentados na unidade", "Visita a grupos de convivência"], ["Post de boas-vindas ao ano", "Story com dicas de segurança"], "Feliz Dia do Aposentado! 💛💙 O Mais BB de Ivatuba está pertinho de você, com atendimento atencioso.", ["Card de homenagem aos aposentados", "Story 'Nunca passe sua senha'"], "40 atendimentos · 10 novos clientes", ["Atendimentos de aposentados", "Retornos realizados"]),
  2: M("Volta às aulas", "Professores e famílias", "Aproximar o correspondente das famílias e da comunidade escolar", "Volta às Aulas", ["Organização do orçamento familiar"], ["Serviços para pessoa física", "Pagamentos e recebimentos"], ["Divulgação nas escolas (com autorização)", "Mensagens para famílias"], ["Volta às aulas (fevereiro)"], ["Visita a escolas", "Atendimento agendado para professores"], ["Post 'Organize o orçamento da volta às aulas'"], "Volta às aulas chegando! Organize suas contas com a gente no Mais BB de Ivatuba. 📚", ["Card volta às aulas", "Status com horário de atendimento"], "3 escolas visitadas · 15 novos contatos", ["Contatos com professores", "Novos clientes famílias"]),
  3: M("Mês da Mulher", "Mulheres e empreendedoras", "Valorizar as mulheres e apresentar os serviços cadastrados", "Dia da Mulher", ["Dia do Consumidor"], ["Serviços para pessoa física", "Serviços para pessoa jurídica"], ["Ação especial na unidade", "Parceria com grupos de mulheres"], ["08/03 · Dia da Mulher", "15/03 · Dia do Consumidor"], ["Recepção especial no Dia da Mulher", "Visita ao comércio no Dia do Consumidor"], ["Post homenagem", "Vídeo curto com dicas"], "Feliz Dia da Mulher! 🌷 Obrigada por confiar no atendimento do Mais BB de Ivatuba.", ["Card Dia da Mulher", "Card Dia do Consumidor"], "50 atendimentos · 12 novos clientes", ["Atendimentos de mulheres", "Interessados"]),
  4: M("Comércio local", "Empreendedores e comerciantes", "Fortalecer relacionamento com o comércio", "Visitas ao comércio", ["Pagamentos para empresas"], ["Serviços para pessoa jurídica", "Pagamentos e recebimentos"], ["Roteiro de visitas por rua/bairro", "Registro no Radar de Ivatuba"], [], ["Visitas comerciais"], ["Post 'Valorize o comércio de Ivatuba'"], "O Mais BB de Ivatuba apoia o comércio local! Venha conhecer nosso atendimento. 🏪", ["Card comércio local"], "10 estabelecimentos visitados", ["Visitas", "Parceiros"]),
  5: M("Trabalhadores e mães", "Trabalhadores e famílias", "Atender quem tem pouco tempo e homenagear as mães", "Dia das Mães", ["Dia do Trabalhador"], ["Pagamentos e recebimentos", "Serviços para pessoa física"], ["Divulgação do horário de atendimento", "Ação de Dia das Mães"], ["01/05 · Dia do Trabalhador", "2º domingo · Dia das Mães"], ["Recepção especial", "Visita a empresas parceiras"], ["Post Dia do Trabalhador", "Post Dia das Mães"], "Feliz Dia das Mães! 💐 Do Mais BB de Ivatuba para todas as mães da nossa cidade.", ["Card Dia das Mães", "Card Dia do Trabalhador"], "50 atendimentos · 10 retornos", ["Atendimentos", "Retornos"]),
  6: M("Servidores e organização financeira", "Funcionários públicos", "Aproximar servidores do correspondente", "Organização financeira do meio do ano", [], ["Serviços para pessoa física"], ["Contato com órgãos públicos (com autorização)"], [], ["Visita institucional"], ["Story com dicas de organização"], "Meio do ano é hora de organizar as contas. Conte com o Mais BB de Ivatuba! 📊", ["Card organização financeira"], "2 ações institucionais", ["Contatos com servidores"]),
  7: M("Campo e comércio", "Produtores rurais e comerciantes", "Estar presente no calendário do campo e homenagear comerciantes", "Dia do Agricultor", ["Dia do Comerciante"], ["Serviços para produtores rurais", "Serviços para pessoa jurídica"], ["Presença em cooperativas e sindicato (com autorização)"], ["16/07 · Dia do Comerciante", "28/07 · Dia do Agricultor"], ["Visita ao sindicato/cooperativa", "Homenagem aos comerciantes"], ["Post Dia do Agricultor"], "Feliz Dia do Agricultor! 🌾 Obrigado por alimentar nossa cidade.", ["Card Dia do Agricultor", "Card Dia do Comerciante"], "1 ação rural · 8 visitas ao comércio", ["Contatos rurais", "Visitas"]),
  8: M("Pais e famílias", "Famílias e trabalhadores", "Relacionamento com famílias", "Dia dos Pais", [], ["Serviços para pessoa física"], ["Ação de Dia dos Pais na unidade"], ["2º domingo · Dia dos Pais"], ["Recepção especial"], ["Post Dia dos Pais"], "Feliz Dia dos Pais! 👨‍👧 Do Mais BB de Ivatuba para todos os pais.", ["Card Dia dos Pais"], "45 atendimentos", ["Atendimentos", "Novos clientes"]),
  9: M("Mês do Cliente", "Clientes atuais", "Fidelizar e pedir indicações", "Dia do Cliente", ["Pesquisa de satisfação"], ["Serviços bancários autorizados"], ["Agradecer clientes", "Pedir indicações com consentimento"], ["15/09 · Dia do Cliente"], ["Recepção especial no Dia do Cliente"], ["Post de agradecimento", "Enquete nos stories"], "Obrigada por ser nosso cliente! 💛💙 Feliz Dia do Cliente — Mais BB de Ivatuba.", ["Card Dia do Cliente"], "20 retornos · 10 indicações", ["Retornos", "Indicações"]),
  10: M("Professores e servidores", "Professores e servidores públicos", "Homenagear e aproximar", "Dia do Professor", ["Dia do Servidor Público"], ["Serviços para pessoa física"], ["Homenagem nas escolas (com autorização)"], ["15/10 · Dia do Professor", "28/10 · Dia do Servidor Público"], ["Entrega de cartões de homenagem"], ["Post Dia do Professor", "Post Dia do Servidor"], "Feliz Dia do Professor! 📚 Obrigada por transformar vidas.", ["Card Dia do Professor", "Card Dia do Servidor"], "3 escolas · 2 órgãos públicos", ["Contatos com professores e servidores"]),
  11: M("Planejamento de fim de ano", "Empreendedores e trabalhadores", "Preparar o fim de ano com organização", "Contas do fim de ano", [], ["Pagamentos e recebimentos", "Serviços para pessoa jurídica"], ["Divulgar horário especial de fim de ano (se houver)"], [], ["Visitas ao comércio"], ["Post de planejamento"], "Fim de ano chegando! Organize suas contas com o Mais BB de Ivatuba. 🗓️", ["Card planejamento"], "50 atendimentos", ["Atendimentos", "Campanhas"]),
  12: M("Natal e relacionamento", "Todos os públicos", "Agradecer e planejar o próximo ano", "Natal", ["Retrospectiva do ano"], ["Serviços bancários autorizados"], ["Agradecer clientes", "Planejar metas do próximo ano"], ["25/12 · Natal"], ["Decoração e recepção natalina"], ["Post de Natal", "Mensagem de fim de ano"], "Feliz Natal! 🎄 O Mais BB de Ivatuba agradece a confiança de todos neste ano.", ["Card de Natal", "Card de Ano Novo"], "Revisar 100% das metas do ano", ["Resultados anuais"]),
};
export const CAMPOS_MES = [["tema", "Tema"], ["publico", "Público prioritário"], ["objetivo", "Objetivo"], ["principal", "Campanha principal"], ["secundarias", "Campanhas secundárias"], ["servicos", "Serviços autorizados a divulgar (categorias)"], ["estrategias", "Estratégias"], ["datas", "Datas comemorativas"], ["presenciais", "Ações presenciais"], ["digitais", "Ações digitais"], ["mensagem", "Mensagem"], ["artes", "Sugestões de artes"], ["metas", "Metas"], ["indicadores", "Indicadores"]];

export function datasComemorativas(ano) {
  const nDom = (mes, n) => { const d = new Date(ano, mes - 1, 1); const off = (7 - d.getDay()) % 7; return new Date(ano, mes - 1, 1 + off + 7 * (n - 1)); };
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const f = (m, d) => `${ano}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return [
    [f(1, 24), "Dia do Aposentado", "aposentados"], [f(2, 2), "Volta às Aulas (início de fevereiro)", "professores"], [f(3, 8), "Dia da Mulher", "outros"], [f(3, 15), "Dia do Consumidor", "empreendedores"],
    [f(5, 1), "Dia do Trabalhador", "trabalhadores"], [iso(nDom(5, 2)), "Dia das Mães", "outros"], [f(7, 16), "Dia do Comerciante", "empreendedores"], [f(7, 28), "Dia do Agricultor", "rurais"],
    [iso(nDom(8, 2)), "Dia dos Pais", "outros"], [f(9, 15), "Dia do Cliente", "outros"], [f(10, 15), "Dia do Professor", "professores"], [f(10, 28), "Dia do Servidor Público", "servidores"], [f(12, 25), "Natal", "outros"],
  ].map(([data, titulo, grupo]) => ({ data, titulo, grupo }));
}

// ------------------------------------------------------------------ PLANEJAMENTO SEMANAL
export const ROTINA_PADRAO = {
  1: { titulo: "PLANEJAMENTO", itens: ["Analisar resultados", "Definir público", "Organizar retornos", "Definir metas"] },
  2: { titulo: "PROSPECÇÃO", itens: ["Buscar oportunidades", "Visitar estabelecimentos", "Fazer contatos autorizados", "Registrar resultados"] },
  3: { titulo: "PÚBLICOS ESPECÍFICOS", itens: ["Professores", "Aposentados", "Servidores", "Trabalhadores", "Empreendedores"] },
  4: { titulo: "RELACIONAMENTO", itens: ["Retornos", "Acompanhamentos", "Atendimento", "Orientações"] },
  5: { titulo: "DIVULGAÇÃO", itens: ["Campanhas", "WhatsApp Status", "Redes sociais", "Preparação da próxima semana"] },
  6: { titulo: "ANÁLISE", itens: ["Conferir resultados", "Atualizar indicadores", "Planejar próximas ações"] },
};
export const SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// ------------------------------------------------------------------ DICAS DO DIA
export const DICAS = [
  ["Atendimento", "Cumprimente pelo nome sempre que possível: as pessoas se sentem lembradas."],
  ["Atendimento", "Antes de explicar, pergunte. Entender a necessidade evita retrabalho."],
  ["Atendimento", "Repita o que o cliente pediu em uma frase para confirmar que entendeu."],
  ["Atendimento", "Com idosos, fale devagar, olhe nos olhos e confirme se ficou claro."],
  ["Atendimento", "Se não souber a resposta, diga que vai confirmar no canal oficial e dê retorno."],
  ["Atendimento", "Termine todo atendimento perguntando: 'Posso ajudar em mais alguma coisa?'"],
  ["Comunicação", "Mensagens de WhatsApp curtas e com uma pergunta no final têm mais resposta."],
  ["Comunicação", "Evite siglas e termos técnicos; troque por palavras do dia a dia."],
  ["Comunicação", "Use o nome da pessoa na primeira linha da mensagem."],
  ["Comunicação", "Áudios longos cansam: prefira texto ou áudios de até 30 segundos."],
  ["Comunicação", "No status do WhatsApp, uma ideia por imagem funciona melhor."],
  ["Vendas responsáveis", "Nunca prometa aprovação, taxa ou prazo: só informe o que está no canal oficial."],
  ["Vendas responsáveis", "Ofereça o que resolve a necessidade do cliente, não o que bate a meta."],
  ["Vendas responsáveis", "Explique custos e responsabilidades com a mesma ênfase que os benefícios."],
  ["Vendas responsáveis", "Respeite o 'não': registre e não insista no mesmo dia."],
  ["Vendas responsáveis", "Não presuma direito a crédito pela profissão, idade ou vínculo do cliente."],
  ["Prospecção", "Visite o comércio no horário de menor movimento (meio da manhã ou meio da tarde)."],
  ["Prospecção", "Defina antes da visita: público, objetivo e uma pergunta de abertura."],
  ["Prospecção", "Registre cada contato no mesmo dia, enquanto a conversa está fresca."],
  ["Prospecção", "Peça autorização antes de cadastrar o contato de alguém."],
  ["Prospecção", "Eventos da cidade são ótimos para se apresentar: leve material autorizado."],
  ["Prospecção", "Uma indicação vale mais que dez contatos frios: peça indicações a clientes satisfeitos."],
  ["Relacionamento", "Faça retorno em até 7 dias depois de um atendimento importante."],
  ["Relacionamento", "Lembre datas especiais dos clientes que autorizaram contato."],
  ["Relacionamento", "Agradeça a preferência: um 'obrigada' sincero fideliza."],
  ["Relacionamento", "Anote preferências do cliente nas observações do cadastro."],
  ["Relacionamento", "Se o cliente pedir para não ser contatado, marque 'não contatar' e respeite."],
  ["Segurança bancária", "Nunca peça nem anote senhas, tokens ou códigos de clientes."],
  ["Segurança bancária", "Oriente: o banco não liga pedindo senha nem pede para fazer transferência de teste."],
  ["Segurança bancária", "Desconfie de pressa e urgência: são sinais de golpe. Oriente o cliente a parar e conferir."],
  ["Segurança bancária", "Nunca fotografe cartões ou documentos completos de clientes no celular pessoal."],
  ["Segurança bancária", "Mantenha a tela do computador bloqueada quando sair do balcão."],
  ["Segurança bancária", "Golpe do falso atendente: oriente o cliente a desligar e ligar no número oficial."],
  ["Organização", "Comece o dia olhando a agenda e os retornos pendentes."],
  ["Organização", "Separe 15 minutos no fim do dia para registrar tudo no sistema."],
  ["Organização", "Priorize: retornos atrasados primeiro, depois prospecção."],
  ["Organização", "Use as metas da semana para decidir o foco de cada dia."],
  ["Organização", "Mantenha a biblioteca de serviços atualizada com a data da conferência."],
  ["Produtividade", "Agrupe tarefas parecidas: todas as mensagens de retorno de uma vez."],
  ["Produtividade", "Use as mensagens prontas e adapte o nome: economiza tempo."],
  ["Produtividade", "Concluiu uma tarefa? Marque como concluída para ver seu progresso."],
  ["Produtividade", "Revise o ranking pela qualidade, não só pela quantidade."],
  ["Produtividade", "Na sexta, prepare as artes e mensagens da semana seguinte."],
];

// ------------------------------------------------------------------ TREINAMENTO
const Q = (p, ops, certa, exp) => ({ p, ops, certa, exp });
export const TREINAMENTO = [
  { k: "atendimento", nome: "Atendimento ao público", texto: ["Receba com cordialidade, nome e contato visual.", "Escute antes de responder e confirme o pedido.", "Encerre perguntando se há algo mais e agradecendo."],
    quiz: [Q("Qual a primeira atitude ao receber um cliente?", ["Explicar todos os serviços", "Cumprimentar e ouvir a necessidade", "Pedir documentos"], 1, "Ouvir primeiro evita retrabalho e mostra respeito."), Q("Se você não sabe a resposta, o que fazer?", ["Inventar uma resposta provável", "Dizer que vai confirmar no canal oficial e dar retorno", "Dispensar o cliente"], 1, "Nunca invente: confirme no canal oficial.")] },
  { k: "comunicacao", nome: "Comunicação", texto: ["Use frases curtas e palavras simples.", "No WhatsApp, termine com uma pergunta.", "Adapte o tom ao público: formal com instituições, acolhedor com idosos."],
    quiz: [Q("Como deve ser uma boa mensagem de WhatsApp?", ["Longa e detalhada", "Curta, com o nome e uma pergunta", "Só com emojis"], 1, "Mensagens curtas e pessoais têm mais resposta.")] },
  { k: "produtos", nome: "Produtos e serviços", texto: ["Use somente a Biblioteca de Serviços, cadastrada a partir dos canais oficiais.", "Confira a data de verificação de cada item.", "Quando a informação não estiver cadastrada, oriente o canal oficial."],
    quiz: [Q("De onde vêm as condições de um serviço?", ["Da memória da atendente", "Dos canais oficiais do Banco do Brasil", "De sites de terceiros"], 1, "Somente canais oficiais."), Q("Um professor tem direito a condição especial só por ser professor?", ["Sim, sempre", "Não se pode presumir; consulte o canal oficial", "Depende da idade"], 1, "Nunca presuma condições por profissão, idade ou vínculo.")] },
  { k: "seguranca", nome: "Segurança", texto: ["Nunca peça senha, token ou código.", "Oriente sobre golpes comuns: falso atendente, falso boleto, falso parente.", "Proteja a tela e os documentos no balcão."],
    quiz: [Q("Um cliente diz que o banco ligou pedindo a senha. O que orientar?", ["Passar a senha se for urgente", "Desligar e procurar o canal oficial", "Mandar a senha por mensagem"], 1, "O banco não pede senha por telefone.")] },
  { k: "lgpd", nome: "LGPD", texto: ["Colete só os dados necessários para a finalidade.", "Peça consentimento quando for contatar por WhatsApp para divulgação.", "Respeite pedidos de não contato e de exclusão."],
    quiz: [Q("Posso cadastrar o telefone de alguém sem autorização para mandar propaganda?", ["Sim", "Não, é preciso base legal/consentimento", "Só se for cliente antigo"], 1, "Divulgação exige consentimento ou base legal adequada."), Q("O cliente pediu para não receber mais mensagens. O que fazer?", ["Continuar mandando", "Marcar 'não contatar' e respeitar", "Apagar e cadastrar de novo"], 1, "Respeitar o pedido é obrigação.")] },
  { k: "relacionamento", nome: "Relacionamento", texto: ["Retorne em até 7 dias.", "Registre preferências no cadastro.", "Peça indicações a clientes satisfeitos."],
    quiz: [Q("Qual o prazo recomendado para um retorno?", ["30 dias", "Até 7 dias", "Nunca"], 1, "Retornos rápidos mostram cuidado.")] },
  { k: "prospeccao", nome: "Técnicas de prospecção", texto: ["Defina público, objetivo e pergunta de abertura antes de sair.", "Visite em horários de menor movimento.", "Registre resultado e próximo passo no mesmo dia."],
    quiz: [Q("O que definir antes de uma visita de prospecção?", ["Nada, improvisar", "Público, objetivo e pergunta de abertura", "Só o endereço"], 1, "Planejamento aumenta o resultado.")] },
  { k: "organizacao", nome: "Organização", texto: ["Comece pelo painel: retornos e agenda.", "Feche o dia registrando tudo.", "Use as metas semanais como bússola."],
    quiz: [Q("O que fazer primeiro ao começar o expediente?", ["Redes sociais", "Ver agenda e retornos pendentes", "Nada"], 1, "Retornos e agenda definem as prioridades.")] },
  { k: "canais", nome: "Conhecimento dos canais oficiais", texto: ["Saiba indicar os canais oficiais de atendimento do Banco do Brasil cadastrados na biblioteca.", "Quando o serviço não for do correspondente, encaminhe corretamente.", "Mantenha os contatos oficiais atualizados no sistema."],
    quiz: [Q("O cliente precisa de um serviço que o correspondente não presta. O que fazer?", ["Dizer que não existe", "Encaminhar ao canal oficial adequado", "Tentar fazer mesmo assim"], 1, "Encaminhe para o canal oficial.")] },
];

// ------------------------------------------------------------------ GERADOR DE MENSAGENS
export const TIPOS_MSG = { primeira: "Primeira abordagem", apresentacao: "Apresentação do correspondente", divulgacao: "Divulgação de serviços", convite: "Convite para atendimento", duvida: "Resposta a dúvidas", retorno: "Mensagem de retorno", agradecimento: "Agradecimento", pos: "Pós-atendimento" };
export const ESTILOS = { formal: "Formal", simples: "Simples", amigavel: "Amigável", comercial: "Comercial", institucional: "Institucional" };
export const CANAIS = { whatsapp: "WhatsApp", presencial: "Presencial", telefone: "Telefone", redes: "Redes sociais", email: "E-mail" };

export function gerarMensagem({ tipo = "primeira", estilo = "amigavel", publico = "", servico = "", canal = "whatsapp", nome = "", unidade = "Mais BB Correspondente Autorizado de Ivatuba", atendente = "" }) {
  const n = nome ? nome.split(" ")[0] : "";
  const sv = servico || "os serviços disponíveis no nosso ponto de atendimento";
  const ab = { formal: `Prezado(a)${n ? ` ${n}` : ""},`, simples: `Oi${n ? `, ${n}` : ""}!`, amigavel: `Olá${n ? `, ${n}` : ""}! 😊`, comercial: `Olá${n ? `, ${n}` : ""}!`, institucional: `${n ? `${n}, ` : ""}bom dia.` }[estilo];
  const quem = atendente ? `Aqui é ${atendente}, do ${unidade}.` : `Aqui é do ${unidade}.`;
  const fim = { formal: "Permaneço à disposição.", simples: "Qualquer coisa, é só chamar.", amigavel: "Estou aqui para ajudar! 💛💙", comercial: "Posso te atender ainda hoje?", institucional: "Atenciosamente, equipe Mais BB." }[estilo];
  const pub = publico ? ` Estamos conversando com ${publico.toLowerCase()} da nossa cidade.` : "";
  const corpo = {
    primeira: `${quem}${pub} Gostaria de apresentar nosso ponto de atendimento e saber se podemos ajudar com ${sv}.`,
    apresentacao: `${quem} Somos um correspondente autorizado do Banco do Brasil aqui em Ivatuba e oferecemos atendimento próximo para ${sv}.`,
    divulgacao: `${quem} Você sabia que pode contar com a gente para ${sv}? Venha conhecer ou fale comigo por aqui para mais informações.`,
    convite: `${quem} Gostaria de convidar você para um atendimento na nossa unidade. Podemos combinar o melhor dia e horário?`,
    duvida: `${quem} Sobre a sua dúvida: vou confirmar as informações nos canais oficiais e já te retorno com segurança.`,
    retorno: `${quem} Estou retornando sobre o nosso último atendimento. Ficou alguma dúvida? Posso ajudar em algo mais?`,
    agradecimento: `${quem} Obrigada pela visita e pela confiança no nosso atendimento!`,
    pos: `${quem} Passando para saber se deu tudo certo depois do seu atendimento. Sua opinião é muito importante para nós.`,
  }[tipo];
  const txt = canal === "presencial" || canal === "telefone"
    ? `${ab.replace(/[😊💛💙]/g, "").trim()} ${corpo} ${fim.replace(/[😊💛💙]/g, "").trim()}`
    : `${ab}\n\n${corpo}\n\n${fim}`;
  return canal === "email" ? `Assunto: ${TIPOS_MSG[tipo]} — Mais BB Ivatuba\n\n${txt}` : txt;
}

// ------------------------------------------------------------------ ASSISTENTE (respostas da base local, sem IA)
export const PERGUNTAS_ASSISTENTE = [
  "Como encontrar novos clientes?", "Como abordar um aposentado?", "Como conversar com professores?", "Como prospectar funcionários públicos?",
  "Como conquistar comerciantes?", "Como divulgar os serviços do correspondente?", "Como responder a um cliente indeciso?", "Como organizar minha semana?",
  "Como melhorar meu atendimento?", "Como criar uma campanha?", "Como apresentar um produto?", "Como fazer acompanhamento?", "Como aumentar o fluxo de clientes?",
];
const R = (estrategia, passos, exemplo, mensagem, acoes, proximas) => ({ estrategia, passos, exemplo, mensagem, acoes, proximas });
export const RESPOSTAS_BASE = {
  "novos clientes": R("Combine presença local (visitas e eventos) com indicações de clientes satisfeitos.", ["Escolha um público no Radar de Clientes", "Liste 10 locais onde ele está (Radar de Ivatuba)", "Visite ou contate com autorização", "Registre cada contato na Prospecção", "Agende o retorno"], "\"Bom dia! Sou a atendente do Mais BB aqui de Ivatuba. Posso deixar nosso contato e explicar rapidinho como atendemos?\"", "Olá! 😊 Aqui é do Mais BB de Ivatuba. Estamos à disposição para orientar sobre os serviços do nosso ponto de atendimento. Posso ajudar?", ["Pedir 1 indicação por atendimento concluído", "Participar de 1 evento municipal por mês"], ["Abrir Prospecção e registrar a ação de hoje"]),
  "aposentado": R("Paciência, clareza e segurança são o centro da abordagem.", ["Cumprimente pelo nome", "Pergunte como resolve as contas hoje", "Explique só o que está na biblioteca", "Reforce: nunca pedimos senha", "Combine retorno"], "\"Dona Maria, aqui a senhora resolve com calma e eu explico tudo. Posso ajudar em quê hoje?\"", "Olá! Aqui é do Mais BB de Ivatuba. Estamos pertinho da senhora/do senhor, com atendimento atencioso. Lembre-se: nunca pedimos senha. 💛💙", ["Palestra sobre golpes em grupos de terceira idade", "Card de segurança no status"], ["Ver página 'Aposentados do INSS' no Radar"]),
  "professores": R("Respeite o tempo: ofereça atendimento agendado e mensagens objetivas.", ["Peça autorização à direção para divulgar", "Deixe material autorizado na sala dos professores", "Ofereça horário agendado", "Registre interessados"], "\"Professora, posso agendar seu atendimento para depois da aula?\"", "Olá, professor(a)! Aqui é do Mais BB de Ivatuba. Que tal agendar um horário que caiba na sua rotina? É só responder aqui. 📚", ["Ação no Dia do Professor (15/10)", "Volta às aulas"], ["Criar tarefa de visita à escola na Agenda"]),
  "servidores": R("Abordagem institucional, com autorização do órgão, sem presumir condições especiais.", ["Solicite autorização ao órgão", "Apresente o correspondente de forma institucional", "Deixe contato oficial", "Ofereça atendimento agendado"], "\"Bom dia! Somos o Mais BB de Ivatuba e gostaríamos de apresentar nosso atendimento aos servidores.\"", "Prezado(a), o Mais BB Correspondente Autorizado de Ivatuba está à disposição para orientar sobre os serviços disponíveis. Atenciosamente.", ["Ação no Dia do Servidor (28/10)"], ["Registrar o órgão no Radar de Ivatuba"]),
  "comerciantes": R("Visite em horário tranquilo, entenda a rotina do negócio e mostre praticidade.", ["Escolha uma rua do centro", "Visite no meio da manhã", "Pergunte como recebe e paga", "Indique os serviços PJ cadastrados", "Agende retorno em 15 dias"], "\"Bom dia! Sei que o movimento é corrido, levo só dois minutos: como o senhor resolve os pagamentos da loja hoje?\"", "Olá! Aqui é do Mais BB de Ivatuba. Apoiamos o comércio local com atendimento próximo. Posso passar aí para conversarmos rapidinho?", ["Roteiro de visitas por rua", "Homenagem no Dia do Comerciante"], ["Cadastrar estabelecimentos no Radar de Ivatuba"]),
  "divulgar": R("Constância: um tema por semana em status, redes e balcão.", ["Escolha o tema do mês no Calendário", "Crie a arte no Estúdio de Marketing", "Publique no status e redes", "Repita no balcão", "Meça perguntas recebidas"], "Status: \"Mais BB Ivatuba: atendimento pertinho de você. Seg a sex.\"", "O Mais BB Correspondente Autorizado de Ivatuba está pertinho de você! Venha conhecer nosso atendimento. 💛💙", ["3 posts por semana", "Calendário de publicações"], ["Abrir Marketing e criar a arte da semana"]),
  "indeciso": R("Entenda a dúvida real, informe com fontes oficiais e dê tempo.", ["Pergunte o que gera dúvida", "Mostre apenas informação oficial", "Não pressione", "Ofereça retorno em data combinada"], "\"Fique à vontade para pensar. Posso te ligar quinta para tirar alguma dúvida?\"", "Olá! Fique à vontade para pensar com calma. Se surgir qualquer dúvida, estou aqui. Posso te chamar na quinta?", ["Agendar retorno", "Enviar material oficial"], ["Criar tarefa de retorno"]),
  "semana": R("Siga o planejamento semanal: segunda planeja, terça prospecta, quarta públicos, quinta relaciona, sexta divulga, sábado analisa.", ["Segunda: ver resultados e metas", "Terça: visitas", "Quarta: público específico", "Quinta: retornos", "Sexta: divulgação", "Sábado: análise"], "", "", ["Use a aba Calendário › Semana"], ["Abrir o Plano de 30 dias"]),
  "atendimento": R("Escuta ativa, clareza, segurança e retorno.", ["Cumprimente pelo nome", "Ouça e confirme o pedido", "Responda com fonte oficial", "Ofereça ajuda extra", "Registre o atendimento"], "\"Entendi: a senhora quer pagar essa conta e tirar uma dúvida, certo?\"", "", ["Fazer o módulo de Atendimento no Treinamento"], ["Registrar todos os atendimentos do dia"]),
  "campanha": R("Toda campanha tem público, objetivo, serviço, período, mensagem e meta.", ["Escolha o público e o tema do mês", "Defina o serviço (da biblioteca)", "Crie mensagem e arte", "Defina meta e período", "Acompanhe semanalmente"], "", "", ["Use Campanhas › Nova campanha"], ["Criar a campanha do mês no Calendário"]),
  "produto": R("Apresente benefício prático, requisitos e canal oficial — sem prometer condições.", ["Abra o item na biblioteca", "Explique finalidade e requisitos", "Mostre documentos necessários", "Indique o canal oficial para condições"], "\"Esse serviço serve para… Para as condições atualizadas, conferimos juntos no canal oficial.\"", "", ["Manter a biblioteca atualizada"], ["Conferir data de verificação dos itens"]),
  "acompanhamento": R("Retorno combinado, registrado e cumprido.", ["Combine a data com o cliente", "Crie a tarefa de retorno", "Envie mensagem no dia", "Registre o resultado"], "", "Olá! Estou retornando como combinamos. Posso ajudar em algo mais? 😊", ["Retornos em até 7 dias"], ["Ver Agenda › Retornos"]),
  "fluxo": R("Visibilidade + indicações + presença em eventos.", ["Divulgue horário e localização", "Peça indicações", "Participe de eventos", "Faça parcerias autorizadas com estabelecimentos"], "", "Venha conhecer o Mais BB de Ivatuba! Atendimento próximo e atencioso. 💛💙", ["Placa/folder na entrada", "Status diário"], ["Planejar 1 evento no mês"]),
};
export function respostaBase(pergunta) {
  const t = pergunta.toLowerCase();
  const mapa = [["novos clientes", /novos clientes|encontrar/], ["aposentado", /aposentad|pensionist|idos/], ["professores", /professor/], ["servidores", /servidor|funcion[aá]rio p[uú]blico/], ["comerciantes", /comerciant|com[eé]rcio|lojist/], ["divulgar", /divulg/], ["indeciso", /indecis/], ["semana", /semana|organizar/], ["atendimento", /melhorar.*atendimento|atendimento/], ["campanha", /campanha/], ["produto", /produto|apresentar/], ["acompanhamento", /acompanhamento|retorno/], ["fluxo", /fluxo|movimento/]];
  const hit = mapa.find(([, re]) => re.test(t));
  return hit ? RESPOSTAS_BASE[hit[0]] : null;
}
