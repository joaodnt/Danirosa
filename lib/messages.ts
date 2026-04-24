const motivationalMessages = [
  {
    text: "Seu tempo é limitado. Não o desperdice vivendo a vida de outra pessoa.",
    author: "Steve Jobs",
    role: "cofundador da Apple"
  },
  {
    text: "Quando acreditamos que podemos, é metade do caminho andado.",
    author: "Walt Disney",
    role: "fundador da Disney"
  },
  {
    text: "Seja você pensando que pode ou que não pode — você está certo.",
    author: "Henry Ford",
    role: "fundador da Ford"
  },
  {
    text: "Eu não falhei. Encontrei 10 mil jeitos que não funcionam.",
    author: "Thomas Edison",
    role: "fundador da General Electric"
  },
  {
    text: "A maior descoberta da minha vida é que eu posso mudar meu futuro apenas mudando minha atitude.",
    author: "Oprah Winfrey",
    role: "empreendedora e fundadora da OWN"
  },
  {
    text: "Boas ideias sempre parecem impossíveis no começo.",
    author: "Coronel Sanders",
    role: "fundador do KFC (aos 65 anos)"
  },
  {
    text: "Meu sucesso é feito de 99% de fracassos.",
    author: "Soichiro Honda",
    role: "fundador da Honda"
  },
  {
    text: "Altas expectativas são a chave de absolutamente tudo.",
    author: "Sam Walton",
    role: "fundador do Walmart"
  },
  {
    text: "Oportunidade de negócio é como ônibus: sempre passa outra.",
    author: "Richard Branson",
    role: "fundador do Virgin Group"
  },
  {
    text: "Quando você quer algo muito forte, o universo inteiro conspira para que você consiga.",
    author: "Howard Schultz",
    role: "fundador da Starbucks"
  },
  {
    text: "O que é perigoso é não evoluir.",
    author: "Jeff Bezos",
    role: "fundador da Amazon"
  },
  {
    text: "O sucesso é um péssimo professor. Ele faz pessoas inteligentes acreditarem que não podem perder.",
    author: "Bill Gates",
    role: "cofundador da Microsoft"
  },
  {
    text: "Se algo é importante o suficiente, você faz — mesmo com as chances contra você.",
    author: "Elon Musk",
    role: "fundador da Tesla e SpaceX"
  },
  {
    text: "A diferença entre gente de sucesso e as outras é a quantidade de vezes que levantaram depois de cair.",
    author: "Warren Buffett",
    role: "fundador da Berkshire Hathaway"
  },
  {
    text: "Nunca, nunca, nunca desista de algo que te faz sorrir.",
    author: "Mary Kay Ash",
    role: "fundadora da Mary Kay Cosmetics"
  },
  {
    text: "Não tenha medo de fracassar. Tenha medo de não tentar.",
    author: "Sara Blakely",
    role: "fundadora da Spanx"
  },
  {
    text: "Fui rejeitado mais de 30 vezes. Se tivesse desistido na 29ª, o Alibaba não existiria.",
    author: "Jack Ma",
    role: "fundador do Alibaba"
  },
  {
    text: "O maior risco é não correr risco nenhum.",
    author: "Mark Zuckerberg",
    role: "cofundador da Meta"
  },
  {
    text: "Eu nunca sonhei com sucesso. Trabalhei por ele.",
    author: "Estée Lauder",
    role: "fundadora da Estée Lauder"
  },
  {
    text: "Pra ser insubstituível, você precisa ser diferente.",
    author: "Coco Chanel",
    role: "fundadora da Chanel"
  },
  {
    text: "Não tem como resistir a alguém que não desiste.",
    author: "Phil Knight",
    role: "cofundador da Nike"
  },
  {
    text: "Se você trabalha só pelo dinheiro, nunca vai chegar lá. Trabalhe pelo propósito.",
    author: "Ray Kroc",
    role: "fundador do McDonald's moderno"
  },
  {
    text: "Você não precisa ser genial. Precisa ter um bom plano e não desistir.",
    author: "Luiza Trajano",
    role: "fundadora do Magazine Luiza"
  },
  {
    text: "Disciplina bate motivação todos os dias.",
    author: "Flávio Augusto",
    role: "fundador da Wise Up e G4 Educação"
  },
  {
    text: "A diferença entre sonhar e empreender tem um nome: ação.",
    author: "Abílio Diniz",
    role: "empresário brasileiro (GPA)"
  },
  {
    text: "Construa seus próprios sonhos ou alguém vai te contratar pra construir os dele.",
    author: "Farrah Gray",
    role: "empreendedor milionário aos 14 anos"
  },
  {
    text: "Não tenha medo de desistir do bom para perseguir o excelente.",
    author: "John D. Rockefeller",
    role: "fundador da Standard Oil"
  },
  {
    text: "Aponte alto. Atirar baixo é covardia — e dá no mesmo.",
    author: "Andrew Carnegie",
    role: "fundador da Carnegie Steel"
  },
  {
    text: "Só pessoas adormecidas cometem erros? Não. Quem não faz nada é que não erra.",
    author: "Ingvar Kamprad",
    role: "fundador da IKEA"
  },
  {
    text: "Não tenha medo do fracasso — tenha medo da mediocridade.",
    author: "Michael Dell",
    role: "fundador da Dell"
  },
  {
    text: "Não é a ausência de quedas que define o sucesso — é quantas vezes você se levanta.",
    author: "Arianna Huffington",
    role: "fundadora do Huffington Post"
  },
  {
    text: "Visão sem execução é alucinação.",
    author: "Thomas Edison",
    role: "fundador da General Electric"
  },
  {
    text: "Eu me orgulho mais do que NÃO fiz do que do que fiz.",
    author: "Steve Jobs",
    role: "cofundador da Apple"
  },
  {
    text: "Empreender é pular do penhasco e montar o avião no meio da queda.",
    author: "Reid Hoffman",
    role: "cofundador do LinkedIn"
  }
];

export function getDailyMessage() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return motivationalMessages[dayOfYear % motivationalMessages.length];
}
