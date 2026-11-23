// =============================================================================
// MAIS BB DIGITAL — conteúdo comercial do sistema (sugestões de relacionamento).
// Nada aqui afirma produto, taxa, limite, prazo ou direito a crédito: serviços
// e condições vêm SOMENTE da biblioteca cadastrada pelo administrador com base
// nas informações oficiais autorizadas ao correspondente.
// =============================================================================

export const AVISO_INDEPENDENTE = "Ferramenta independente de apoio à atendente. Não é aplicativo oficial do Banco do Brasil e não realiza operações bancárias.";

// ------------------------------------------------------------------ PÚBLICOS
const G = {
  aposentados: { nome: "Aposentados e pensionistas", emoji: "🧓", cor: "#7C3AED",
    perfil: "Pessoas que recebem aposentadoria ou pensão, muitas com rotina mensal de ir ao comércio e pagar contas no início do mês.",
    necessidades: ["Pagar contas com comodidade perto de casa", "Orientação clara e sem pressa", "Segurança contra golpes", "Organização do orçamento do mês"],
    onde: ["No próprio correspondente nos dias de maior movimento do mês", "Grupos de convivência e associações de aposentados", "Igrejas e encontros comunitários", "Farmácias e mercados do bairro"],
    conversa: "Bom dia! Tudo bem com o(a) senhor(a)? Aqui no Mais BB a gente atende com calma. Posso ajudar com alguma conta ou dúvida hoje?",
    perguntas: ["Como o(a) senhor(a) costuma pagar suas contas hoje?", "Tem alguma dúvida sobre serviços do banco que eu possa orientar?", "Prefere ser atendido(a) em algum horário mais tranquilo?", "Alguém da família costuma ajudar com essas questões?"],
    apresentacao: "Explique devagar, com exemplos do dia a dia, confirme se a pessoa entendeu e entregue por escrito quando possível. Nunca pressione decisões.",
    faq: ["Posso pagar minhas contas aqui? → Informe só os serviços cadastrados como autorizados.", "Vocês ligam pedindo senha? → Nunca: o banco não pede senha por telefone ou mensagem."],
    acompanhamento: "Retorne no próximo mês no mesmo período, pergunte se ficou alguma dúvida e reforce as orientações de segurança.",
    campanhas: ["Dia do Aposentado (24/01)", "Semana da segurança contra golpes", "Atendimento sem pressa no início do mês"] },
  professores: { nome: "Professores", emoji: "👩‍🏫", cor: "#0A7C8C",
    perfil: "Profissionais da educação com rotina corrida, que valorizam praticidade e atendimento rápido.",
    necessidades: ["Resolver tudo rápido no intervalo ou após o expediente", "Orientação objetiva", "Organização financeira do ano letivo"],
    onde: ["Escolas municipais, estaduais e particulares (com autorização da direção)", "Reuniões e eventos escolares", "Grupos de professores", "Volta às aulas e Dia do Professor"],
    conversa: "Olá, professor(a)! Sei que a rotina é corrida, por isso aqui no Mais BB o atendimento é rápido e perto da escola. Posso te mostrar o que dá para resolver aqui?",
    perguntas: ["Qual o melhor horário para você ser atendido(a)?", "Que tipo de serviço bancário você mais precisa no dia a dia?", "Gostaria de receber avisos de campanhas pelo WhatsApp?"],
    apresentacao: "Seja objetiva: diga o que resolve aqui, quanto tempo leva e o horário de atendimento.",
    faq: ["Vocês atendem depois das aulas? → Informe o horário cadastrado do correspondente."],
    acompanhamento: "Envie lembrete antes da volta às aulas e no Dia do Professor, com o horário de atendimento.",
    campanhas: ["Volta às aulas", "Dia do Professor (15/10)"] },
  servidores: { nome: "Funcionários públicos", emoji: "🏛️", cor: "#1D4ED8",
    perfil: "Servidores municipais, estaduais e federais, ativos ou aposentados.",
    necessidades: ["Atendimento próximo ao local de trabalho", "Orientação sobre serviços disponíveis no correspondente", "Agilidade"],
    onde: ["Prefeitura e secretarias (com autorização)", "Postos de saúde e escolas", "Associações de servidores", "Dia do Servidor Público"],
    conversa: "Olá! Trabalho no Mais BB aqui de Ivatuba. Quero deixar nosso contato com a equipe para quando precisarem de algum serviço perto do trabalho.",
    perguntas: ["Que serviços vocês mais procuram no dia a dia?", "Qual horário seria mais prático para a equipe?", "Posso deixar um material informativo com o setor?"],
    apresentacao: "Apresente o correspondente como opção prática e perto do trabalho; deixe material informativo autorizado.",
    faq: ["Tenho condição especial por ser servidor? → Não presuma: oriente a consultar os canais oficiais do Banco do Brasil."],
    acompanhamento: "Visita de relacionamento a cada trimestre e mensagem no Dia do Servidor Público.",
    campanhas: ["Dia do Servidor Público (28/10)"] },
  trabalhadores: { nome: "Trabalhadores", emoji: "👷", cor: "#C2410C",
    perfil: "Trabalhadores CLT do comércio, indústria, saúde e serviços, com pouco tempo livre.",
    necessidades: ["Atendimento rápido no horário de almoço ou fim do dia", "Pagamento de contas", "Orientação"],
    onde: ["Empresas e indústrias da cidade (com autorização)", "Comércios no horário de almoço", "Unidades de saúde", "Dia do Trabalhador"],
    conversa: "Oi! Sabia que dá para resolver vários serviços aqui no Mais BB, pertinho do trabalho? Posso te mostrar rapidinho?",
    perguntas: ["Qual horário você consegue vir?", "Que serviço você mais precisa resolver?", "Prefere receber avisos pelo WhatsApp?"],
    apresentacao: "Foque em tempo: o que resolve aqui e quanto tempo leva.",
    faq: ["Vocês abrem no horário de almoço? → Informe o horário cadastrado."],
    acompanhamento: "Lembrete mensal perto da data de pagamento das contas.",
    campanhas: ["Dia do Trabalhador (01/05)"] },
  empreendedores: { nome: "Empreendedores", emoji: "🏪", cor: "#0A5AA8",
    perfil: "MEIs, comerciantes, autônomos, profissionais liberais e pequenos empresários.",
    necessidades: ["Agilidade para pagamentos do negócio", "Orientação sobre serviços para pessoa jurídica disponíveis no correspondente", "Relacionamento próximo"],
    onde: ["Comércio local (visita de relacionamento)", "Associação comercial", "Sala do Empreendedor e eventos", "Feiras da cidade"],
    conversa: "Bom dia! Sou do Mais BB aqui de Ivatuba. Estou visitando os comerciantes para apresentar o que dá para resolver no correspondente, pertinho da sua loja.",
    perguntas: ["Que serviços bancários você mais usa no negócio?", "Qual o melhor horário para você?", "Posso deixar nosso contato e horários?"],
    apresentacao: "Visita curta, cartão de contato e lista dos serviços autorizados. Respeite o tempo do comerciante.",
    faq: ["Vocês atendem empresa? → Informe somente os serviços PJ cadastrados como autorizados."],
    acompanhamento: "Retorno em 15 dias; ofereça ajuda em datas fortes do comércio.",
    campanhas: ["Dia do Comerciante (16/07)", "Dia do Consumidor (15/03)", "Natal no comércio"] },
  rurais: { nome: "Produtores rurais", emoji: "🌾", cor: "#3F7D20",
    perfil: "Agricultores, pecuaristas, produtores de leite e agricultura familiar.",
    necessidades: ["Atendimento perto de casa ao vir à cidade", "Orientação sobre serviços rurais disponíveis no correspondente", "Encaminhamento aos canais oficiais quando necessário"],
    onde: ["Sindicato rural e cooperativas", "Agropecuárias", "Laticínios", "Feiras do produtor", "Dia do Agricultor"],
    conversa: "Bom dia! Aqui no Mais BB a gente atende o pessoal do campo também. Quando vier à cidade, pode contar com a gente para os serviços disponíveis.",
    perguntas: ["Em que dias costuma vir à cidade?", "Que serviços mais precisa resolver?", "Prefere contato por telefone ou WhatsApp?"],
    apresentacao: "Linguagem simples, respeitosa; encaminhe aos canais oficiais o que não for atendido no correspondente.",
    faq: ["Vocês fazem crédito rural? → Informe apenas o que estiver cadastrado como autorizado; caso contrário, oriente o canal oficial."],
    acompanhamento: "Contato no início e fim de safra; mensagem no Dia do Agricultor.",
    campanhas: ["Dia do Agricultor (28/07)"] },
  outros: { nome: "Outros públicos", emoji: "👥", cor: "#DB2777",
    perfil: "Jovens, universitários, mulheres, famílias, novos moradores e quem ainda não conhece o correspondente.",
    necessidades: ["Conhecer o que o correspondente faz", "Orientação simples", "Segurança digital"],
    onde: ["Redes sociais e WhatsApp Status", "Escolas e faculdades (com autorização)", "Igrejas e eventos comunitários", "Novos moradores indicados por clientes"],
    conversa: "Oi! Você já conhece o Mais BB aqui de Ivatuba? É um correspondente autorizado onde dá para resolver vários serviços perto de casa.",
    perguntas: ["Você já usou o correspondente?", "Que serviço seria mais útil para você?", "Como prefere receber novidades?"],
    apresentacao: "Mostre a praticidade e reforce dicas de segurança.",
    faq: ["O que dá para fazer aqui? → Mostre a lista de serviços autorizados cadastrada."],
    acompanhamento: "Convite para seguir as redes e voltar quando precisar.",
    campanhas: ["Dia da Mulher (08/03)", "Dia das Mães", "Dia dos Pais"] },
};
const SUB = {
  aposentados: [["inss", "Aposentados do INSS"], ["pensionistas", "Pensionistas"], ["publico", "Aposentados do setor público"], ["privado", "Aposentados do setor privado"]],
  professores: [["municipais", "Professores municipais"], ["estaduais", "Professores estaduais"], ["federais", "Professores federais"], ["particulares", "Professores particulares"], ["aposentados", "Professores aposentados"]],
  servidores: [["municipais", "Servidores municipais"], ["estaduais", "Servidores estaduais"], ["federais", "Servidores federais"], ["aposentados", "Servidores aposentados"]],
  trabalhadores: [["clt", "Funcionários CLT"], ["comercio", "Trabalhadores do comércio"], ["industria", "Trabalhadores da indústria"], ["saude", "Profissionais da saúde"], ["servicos", "Prestadores de serviços"]],
  empreendedores: [["mei", "MEI"], ["micro", "Microempresários"], ["comerciantes", "Comerciantes"], ["liberais", "Profissionais liberais"], ["autonomos", "Autônomos"], ["pequenos", "Pequenos empresários"]],
  rurais: [["agricultores", "Agricultores"], ["pecuaristas", "Pecuaristas"], ["leite", "Produtores de leite"], ["familiar", "Agricultura familiar"], ["pequenos", "Pequenos produtores"]],
  outros: [["jovens", "Jovens"], ["universitarios", "Universitários"], ["mulheres", "Mulheres"], ["familias", "Famílias"], ["novos", "Novos moradores"], ["desconhecem", "Quem ainda não conhece o correspondente"]],
};
export const GRUPOS = G;
export const PUBLICOS_BASE = Object.entries(SUB).flatMap(([g, subs]) => subs.map(([k, nome]) => ({ chave: `${g}.${k}`, grupo: g, nome, ...G[g], meta: 10 })));
export function publicosCompletos(custom = []) {
  const m = new Map(PUBLICOS_BASE.map((p) => [p.chave, p]));
  for (const c of custom) {
    const base = m.get(c.chave) || G[c.grupo] || {};
    m.set(c.chave, { ...base, ...(c.conteudo || {}), chave: c.chave, grupo: c.grupo, nome: c.nome, ativo: c.ativo, personalizado: true });
  }
  return [...m.values()].filter((p) => p.ativo !== false);
}

// ------------------------------------------------------------------ ATENDIMENTO
export const CATEGORIAS_ATEND = { bancario: "Atendimento bancário", pagamentos: "Pagamentos", credito: "Crédito", financiamento: "Financiamento", orientacao: "Orientação", pf: "Pessoa física", pj: "Pessoa jurídica", rural: "Atendimento rural", documentacao: "Documentação", outros: "Outros" };
export const RESULTADOS = { concluido: "Concluído", orientado: "Orientado", encaminhado: "Encaminhado", aguardando: "Aguardando retorno", nao_concluido: "Não concluído" };
export const STATUS_ATEND = { aberto: "Aberto", em_andamento: "Em andamento", finalizado: "Finalizado" };
export const ORIGENS = { balcao: "Atendimento no balcão", indicacao: "Indicação", whatsapp: "WhatsApp", redes: "Redes sociais", visita: "Visita/prospecção", evento: "Evento", campanha: "Campanha", outro: "Outro" };
export const OPORTUNIDADE = { nova: "Nova", interessado: "Interessado", acompanhamento: "Em acompanhamento", atendido: "Atendido", sem_interesse: "Sem interesse" };
export const TIPOS_PROSP = { presencial: "Presencial", whatsapp: "WhatsApp", telefone: "Telefone", redes: "Redes sociais", evento: "Eventos", visita: "Visita comercial", parceria: "Parceria institucional autorizada" };
export const STATUS_PROSP = { planejada: "Planejada", realizada: "Realizada", retorno: "Aguardando retorno", convertida: "Virou atendimento", sem_interesse: "Sem interesse" };
export const CAT_LOCAIS = { comercio: "Comércios", empresa: "Empresas", escola: "Escolas", escritorio: "Escritórios", servicos: "Prestadores de serviços", associacao: "Associações", comunidade: "Comunidades", rural: "Produtores rurais", evento: "Eventos municipais", grupo: "Grupos comunitários" };
export const STATUS_LOCAL = { a_visitar: "A visitar", visitado: "Visitado", acompanhamento: "Em acompanhamento", parceria: "Parceria/ação combinada", sem_interesse: "Sem interesse" };
export const CAT_SERVICOS = ["Serviços bancários autorizados", "Pagamentos e recebimentos", "Serviços para pessoa física", "Serviços para pessoa jurídica", "Crédito", "Empréstimos", "Financiamentos", "Serviços para produtores rurais", "Outros serviços disponíveis ao correspondente"];
// Sugestões de NOMES para o administrador conferir no contrato/portal do correspondente antes de ativar
export const SUGESTOES_SERVICOS = [
  ["Pagamentos e recebimentos", "Pagamento de contas de consumo (água, luz, telefone)"],
  ["Pagamentos e recebimentos", "Pagamento de boletos"],
  ["Pagamentos e recebimentos", "Pagamento de tributos e taxas (IPTU, Detran, impostos)"],
  ["Serviços bancários autorizados", "Depósitos"],
  ["Serviços bancários autorizados", "Saques"],
  ["Serviços bancários autorizados", "Consulta de saldo e extrato"],
  ["Serviços para pessoa física", "Encaminhamento de abertura de conta"],
  ["Crédito", "Encaminhamento de propostas de crédito"],
];

// ------------------------------------------------------------------ METAS
export const INDICADORES = { atendimentos: "Atendimentos", novos_clientes: "Novos clientes", prospeccoes: "Prospecções", visitas: "Visitas", retornos: "Retornos feitos", campanhas: "Campanhas ativas", interessados: "Clientes interessados" };

// ------------------------------------------------------------------ PLANEJAMENTO SEMANAL (configurável)
export const SEMANA_PADRAO = {
  1: { foco: "Planejamento", acoes: ["Analisar resultados da semana anterior", "Definir o público da semana", "Organizar os retornos", "Definir metas"] },
  2: { foco: "Prospecção", acoes: ["Buscar oportunidades no radar", "Visitar estabelecimentos", "Fazer contatos autorizados", "Registrar resultados"] },
  3: { foco: "Públicos específicos", acoes: ["Professores", "Aposentados", "Servidores", "Trabalhadores", "Empreendedores"] },
  4: { foco: "Relacionamento", acoes: ["Fazer os retornos", "Acompanhamentos", "Atendimento", "Orientações"] },
  5: { foco: "Divulgação", acoes: ["Campanhas ativas", "WhatsApp Status", "Redes sociais", "Preparar a próxima semana"] },
  6: { foco: "Análise", acoes: ["Conferir resultados", "Atualizar indicadores", "Planejar próximas ações"] },
  0: { foco: "Descanso", acoes: [] },
};

// ------------------------------------------------------------------ CALENDÁRIO COMERCIAL (12 meses)
export const MESES = [
  { tema: "Planejamento do ano e relacionamento", publico: "aposentados", objetivo: "Retomar o contato com a clientela e apresentar o correspondente para o ano", principal: "Dia do Aposentado", secundarias: ["Organização das contas do início do ano", "Segurança contra golpes"], datas: [["01-24", "Dia do Aposentado"]] },
  { tema: "Volta às aulas", publico: "professores", objetivo: "Aproximar das escolas e famílias", principal: "Volta às aulas", secundarias: ["Famílias organizadas", "Novos moradores"], datas: [] },
  { tema: "Mês da mulher e do consumidor", publico: "outros", objetivo: "Valorizar mulheres e clientes da cidade", principal: "Dia da Mulher", secundarias: ["Dia do Consumidor", "Comércio local"], datas: [["03-08", "Dia Internacional da Mulher"], ["03-15", "Dia do Consumidor"]] },
  { tema: "Relacionamento com o comércio", publico: "empreendedores", objetivo: "Visitar comércios e prestadores de serviço", principal: "Correspondente perto do seu negócio", secundarias: ["MEIs da cidade", "Prestadores de serviços"], datas: [] },
  { tema: "Trabalhadores e famílias", publico: "trabalhadores", objetivo: "Atender quem tem pouco tempo e as famílias", principal: "Dia do Trabalhador", secundarias: ["Dia das Mães", "Atendimento no horário de almoço"], datas: [["05-01", "Dia do Trabalhador"], ["maes", "Dia das Mães"]] },
  { tema: "Servidores e organização financeira", publico: "servidores", objetivo: "Relacionamento com órgãos públicos", principal: "Perto do seu trabalho", secundarias: ["Organização do meio do ano", "Segurança digital"], datas: [] },
  { tema: "Campo e comércio", publico: "rurais", objetivo: "Aproximar dos produtores rurais e comerciantes", principal: "Dia do Agricultor", secundarias: ["Dia do Comerciante", "Férias escolares"], datas: [["07-16", "Dia do Comerciante"], ["07-28", "Dia do Agricultor"]] },
  { tema: "Famílias e pais", publico: "outros", objetivo: "Campanha de relacionamento com famílias", principal: "Dia dos Pais", secundarias: ["Volta às aulas do 2º semestre", "Jovens"], datas: [["pais", "Dia dos Pais"]] },
  { tema: "Mês do cliente", publico: "empreendedores", objetivo: "Agradecer e fidelizar a clientela", principal: "Dia do Cliente", secundarias: ["Pós-atendimento", "Indicações"], datas: [["09-15", "Dia do Cliente"]] },
  { tema: "Educação e serviço público", publico: "professores", objetivo: "Homenagear professores e servidores", principal: "Dia do Professor", secundarias: ["Dia do Servidor Público", "Dia das Crianças"], datas: [["10-15", "Dia do Professor"], ["10-28", "Dia do Servidor Público"]] },
  { tema: "Preparação para o fim de ano", publico: "trabalhadores", objetivo: "Organização das contas de fim de ano", principal: "Fim de ano organizado", secundarias: ["Black Friday com responsabilidade", "Comércio local"], datas: [] },
  { tema: "Natal e agradecimento", publico: "aposentados", objetivo: "Agradecer, fidelizar e planejar o próximo ano", principal: "Natal", secundarias: ["Retrospectiva do ano", "Planejamento do próximo ano"], datas: [["12-25", "Natal"]] },
];

// ------------------------------------------------------------------ DICAS DO DIA
export const DICAS = [
  ["Atendimento", "Chame o cliente pelo nome e olhe nos olhos: isso transmite segurança."],
  ["Atendimento", "Antes de explicar, pergunte: \"O que o(a) senhor(a) precisa resolver hoje?\"."],
  ["Atendimento", "Confirme o entendimento: peça ao cliente para repetir com as palavras dele."],
  ["Atendimento", "Se não souber a resposta, diga que vai confirmar no canal oficial e retorne."],
  ["Comunicação", "Troque termos técnicos por palavras do dia a dia."],
  ["Comunicação", "Mensagens de WhatsApp curtas, com uma pergunta no final, têm mais resposta."],
  ["Comunicação", "Use o nome da pessoa no início da mensagem."],
  ["Comunicação", "Evite áudios longos: prefira texto curto e objetivo."],
  ["Vendas responsáveis", "Nunca prometa aprovação, taxa ou prazo: isso depende das regras oficiais do banco."],
  ["Vendas responsáveis", "Ofereça o que resolve a necessidade do cliente, não o que bate a meta."],
  ["Vendas responsáveis", "Respeite o \"não\": registre e não insista."],
  ["Vendas responsáveis", "Não presuma que alguém tem direito a crédito pela profissão ou idade."],
  ["Prospecção", "Visite 3 estabelecimentos por dia: em um mês são mais de 60 contatos."],
  ["Prospecção", "Leve material informativo autorizado nas visitas."],
  ["Prospecção", "Peça indicação a clientes satisfeitos."],
  ["Prospecção", "Registre todo contato no sistema na hora: memória falha, registro não."],
  ["Relacionamento", "Retorne no dia combinado: pontualidade gera confiança."],
  ["Relacionamento", "Uma mensagem de agradecimento após o atendimento faz diferença."],
  ["Relacionamento", "Lembre datas importantes do cliente (com consentimento)."],
  ["Segurança bancária", "Nunca peça nem anote senhas, tokens ou códigos de clientes."],
  ["Segurança bancária", "Oriente: o banco não liga pedindo senha nem manda link para \"desbloquear\" conta."],
  ["Segurança bancária", "Desconfie de pressa e pressão: são sinais comuns de golpe."],
  ["Segurança bancária", "Confira documentos com atenção e proteja a tela do terminal."],
  ["Organização", "Comece o dia pela agenda e pelos retornos atrasados."],
  ["Organização", "Separe 15 minutos no fim do dia para registrar resultados."],
  ["Organização", "Mantenha a lista de serviços autorizados sempre atualizada."],
  ["Produtividade", "Agrupe as visitas por bairro para economizar tempo."],
  ["Produtividade", "Use mensagens prontas e personalize só o nome e o detalhe."],
  ["Produtividade", "Defina 3 prioridades do dia e conclua antes de abrir novas frentes."],
  ["Produtividade", "Revise suas metas toda segunda-feira."],
];

// ------------------------------------------------------------------ TREINAMENTO
export const TREINAMENTOS = [
  { chave: "t-atendimento", modulo: "Atendimento ao público", titulo: "Atendimento que acolhe", conteudo: "1. Receba com cordialidade e atenção total.\n2. Escute antes de falar: entenda a necessidade.\n3. Explique de forma simples e confirme o entendimento.\n4. Seja transparente: se algo não é feito no correspondente, oriente o canal oficial.\n5. Registre o atendimento e combine o próximo passo.",
    quiz: [{ p: "O primeiro passo de um bom atendimento é:", ops: ["Oferecer um produto", "Entender a necessidade do cliente", "Falar das metas"], c: 1 }, { p: "Se você não sabe a resposta, deve:", ops: ["Inventar uma resposta", "Confirmar no canal oficial e retornar", "Dizer que não é possível"], c: 1 }] },
  { chave: "t-comunicacao", modulo: "Comunicação", titulo: "Comunicação clara", conteudo: "Use palavras simples, frases curtas e exemplos do dia a dia. No WhatsApp, escreva mensagens curtas, com o nome da pessoa e uma pergunta no final. Evite áudios longos e termos técnicos.",
    quiz: [{ p: "Uma boa mensagem de WhatsApp é:", ops: ["Longa e cheia de detalhes", "Curta, com nome e uma pergunta", "Só um áudio de 3 minutos"], c: 1 }] },
  { chave: "t-produtos", modulo: "Produtos e serviços", titulo: "Somente serviços autorizados", conteudo: "Apresente apenas os serviços cadastrados na biblioteca como autorizados ao correspondente. Condições, taxas, limites e prazos são sempre os vigentes nos canais oficiais do Banco do Brasil. Nunca prometa aprovação.",
    quiz: [{ p: "Pode-se prometer aprovação de crédito ao cliente?", ops: ["Sim, se ele tiver bom perfil", "Não, a aprovação depende das regras oficiais", "Sim, para aposentados"], c: 1 }] },
  { chave: "t-seguranca", modulo: "Segurança", titulo: "Segurança no atendimento", conteudo: "Nunca peça, anote ou guarde senhas, tokens, códigos ou dados completos de cartões. Oriente os clientes sobre golpes: o banco não liga pedindo senha nem envia links para desbloqueio. Proteja documentos e a tela do terminal.",
    quiz: [{ p: "É permitido anotar a senha do cliente para ajudá-lo?", ops: ["Sim, com autorização", "Nunca", "Só para idosos"], c: 1 }, { p: "Ligação pedindo senha para 'desbloquear a conta' é:", ops: ["Procedimento normal", "Sinal de golpe", "Atualização cadastral"], c: 1 }] },
  { chave: "t-lgpd", modulo: "LGPD", titulo: "Proteção de dados (LGPD)", conteudo: "Colete só os dados necessários e para uma finalidade clara. Peça consentimento para contatos de divulgação e respeite quem não quer receber mensagens. Não cadastre dados pessoais de terceiros sem base legal. Guarde as informações com segurança.",
    quiz: [{ p: "Cliente pediu para não receber mensagens. Você deve:", ops: ["Continuar enviando campanhas", "Marcar 'não contatar' e respeitar", "Mandar só no Natal"], c: 1 }] },
  { chave: "t-relacionamento", modulo: "Relacionamento", titulo: "Relacionamento de longo prazo", conteudo: "Retorne no dia combinado, agradeça depois do atendimento, peça indicações de clientes satisfeitos e registre tudo no histórico para dar continuidade.",
    quiz: [{ p: "O que mais gera confiança no relacionamento?", ops: ["Cumprir o retorno combinado", "Mandar muitas mensagens", "Oferecer tudo de uma vez"], c: 0 }] },
  { chave: "t-prospeccao", modulo: "Técnicas de prospecção", titulo: "Prospecção que funciona", conteudo: "Defina público e objetivo, escolha o canal (presencial, WhatsApp, telefone, eventos), use mensagem pronta personalizada, registre o resultado e agende o retorno. Visitas curtas e frequentes rendem mais que visitas longas e raras.",
    quiz: [{ p: "Depois de cada contato de prospecção, você deve:", ops: ["Registrar e agendar o retorno", "Esperar o cliente ligar", "Não anotar nada"], c: 0 }] },
  { chave: "t-organizacao", modulo: "Organização", titulo: "Organização do dia", conteudo: "Comece pela agenda e retornos atrasados, siga a estratégia do dia, registre cada ação e reserve 15 minutos no fim do expediente para atualizar o sistema.",
    quiz: [{ p: "Qual a primeira coisa do dia?", ops: ["Conferir agenda e retornos", "Postar nas redes", "Ligar para todos os clientes"], c: 0 }] },
  { chave: "t-canais", modulo: "Canais oficiais", titulo: "Conhecimento dos canais oficiais", conteudo: "Quando um assunto não é atendido no correspondente, oriente o cliente aos canais oficiais do Banco do Brasil (agência, aplicativo oficial, site oficial e central de atendimento oficial). Cadastre os canais oficiais na biblioteca de serviços para consulta rápida.",
    quiz: [{ p: "Assunto não atendido no correspondente:", ops: ["Inventar uma solução", "Orientar os canais oficiais do BB", "Dispensar o cliente"], c: 1 }] },
];

// ------------------------------------------------------------------ MENSAGENS
export const TIPOS_MSG = { primeira: "Primeira abordagem", apresentacao: "Apresentação do correspondente", divulgacao: "Divulgação de serviços", convite: "Convite para atendimento", duvida: "Resposta a dúvidas", retorno: "Mensagem de retorno", agradecimento: "Agradecimento", pos: "Pós-atendimento" };
export const ESTILOS = { formal: "Formal", simples: "Simples", amigavel: "Amigável", comercial: "Comercial", institucional: "Institucional" };
export const CANAIS = { whatsapp: "WhatsApp", presencial: "Presencial", telefone: "Telefone", redes: "Redes sociais" };

export function gerarMensagem({ tipo = "primeira", estilo = "amigavel", publico, servico, nome, atendente, correspondente = "Mais BB", canal = "whatsapp", horario }) {
  const n = (nome || "").split(" ")[0];
  const cump = { formal: `Prezado(a)${n ? ` ${n}` : ""}, bom dia.`, simples: `Oi${n ? `, ${n}` : ""}!`, amigavel: `Oi${n ? `, ${n}` : ""}! Tudo bem? 😊`, comercial: `Olá${n ? `, ${n}` : ""}!`, institucional: `Olá${n ? `, ${n}` : ""}.` }[estilo];
  const eu = atendente ? `Aqui é ${atendente.split(" ")[0]}, do ${correspondente} de Ivatuba` : `Aqui é do ${correspondente} de Ivatuba`;
  const serv = servico ? ` ${servico.toLowerCase()}` : " os serviços disponíveis";
  const hor = horario ? ` Nosso horário: ${horario}.` : "";
  const pub = publico ? ` para ${publico.toLowerCase()}` : "";
  const fim = { formal: "Atenciosamente.", simples: "", amigavel: "Fico à disposição! 💛", comercial: "Te espero aqui! 💙💛", institucional: `${correspondente} — Correspondente Autorizado.` }[estilo];
  const corpo = {
    primeira: `${eu}. Estou entrando em contato para me apresentar e deixar nosso atendimento à disposição${pub}. Posso te contar o que dá para resolver aqui, pertinho de você?`,
    apresentacao: `${eu}, correspondente autorizado. Aqui você encontra${serv}, com atendimento próximo e sem complicação.${hor}`,
    divulgacao: `${eu}. Lembrando que aqui no correspondente você pode contar com${serv}.${hor} Ficou com alguma dúvida? É só responder esta mensagem.`,
    convite: `${eu}. Que tal passar aqui para resolvermos${serv}? Será um prazer te atender.${hor}`,
    duvida: `${eu}. Obrigada pela pergunta! Sobre${serv}: te passo as informações oficiais e atualizadas para você não ter dúvida. Condições e regras são sempre as vigentes do Banco do Brasil.`,
    retorno: `${eu}. Estou retornando como combinamos. Conseguiu resolver o que precisava? Posso ajudar em mais alguma coisa?`,
    agradecimento: `${eu}. Muito obrigada pela visita e pela confiança! Sempre que precisar, estamos aqui.`,
    pos: `${eu}. Passando para saber se ficou tudo certo com seu atendimento. Sua opinião é muito importante para nós!`,
  }[tipo];
  let txt = [cump, corpo, fim].filter(Boolean).join("\n\n");
  if (canal === "telefone") txt = `Roteiro de ligação:\n1) ${cump.replace(/😊|💛|💙/g, "")} ${eu}.\n2) ${corpo.replace(`${eu}. `, "").replace(`${eu}, `, "")}\n3) Pergunte se ficou alguma dúvida e combine o próximo passo.`;
  if (canal === "presencial") txt = `Abordagem presencial:\n"${cump.replace(/😊|💛|💙/g, "").trim()} ${corpo}"\n\nDica: sorria, seja breve e entregue o contato/material autorizado.`;
  if (canal === "redes") txt = `${corpo.replace(eu + ". ", "").replace(eu + ", ", "")}\n\n📍 ${correspondente} · Ivatuba-PR${hor ? `\n🕒 ${horario}` : ""}\n\n${AVISO_REDES}`;
  return txt;
}
const AVISO_REDES = "Correspondente autorizado. Condições e regras conforme os canais oficiais do Banco do Brasil.";
