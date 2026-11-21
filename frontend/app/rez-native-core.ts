/**
 * REZ Native — a small first-party knowledge and code guidance engine.
 *
 * No language-model weights or external inference service are used.
 * It provides instant, deterministic answers for covered subjects, a
 * lexical source directory, contextual follow-ups, and honest uncertainty.
 *
 * This is NOT an LLM and must not claim open-ended generative capability.
 */
import sourceCatalog from '../public/rez-knowledge-catalog.json';
import {
  taskManager, calculator, recursionExample, listFunctionsExample,
  sqlExample, pandasExample, jsExample, htmlExample, returnExample,
} from './rez-native-examples';

export type NativeTurn = { role: 'user' | 'assistant'; content: string };
export type NativeMode = 'general' | 'study' | 'code' | 'summary';
export type NativeAnswer = {
  text: string;
  topic: string;
  method: 'guided' | 'calculation' | 'extractive' | 'fallback';
  sources: Array<{ name: string; url: string }>;
  engine: 'REZ Native';
};

const STOP = new Set(['qual','quais','como','para','isso','essa','esse','quero','preciso',
  'fazer','posso','uma','umas','sobre','mais','menos','meu','minha','voce',
  'esse','de','do','da','dos','das','em','um','na','no','com','que','porque',
  'por','a','o','as','os','e','ou','me','eu','se','ele','ela','nos','ai']);

const normalize = (value: string): string => value.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\p{L}\p{N}+\-*/(). ]/gu, ' ').replace(/\s+/g, ' ').trim();

function includesAny(text: string, pieces: string[]): boolean {
  return pieces.some(x => text.includes(x));
}

type Source = { nome: string; url: string; categoria: string };
const catalog: Source[] = (sourceCatalog.fontes as Source[]).filter(item =>
  item && typeof item.nome === 'string' && typeof item.url === 'string' &&
  item.url.startsWith('https://')
);

function suggestedSources(subject: string, topic = ''): Array<{ name: string; url: string }> {
  const terms = Array.from(new Set(normalize(subject + ' ' + topic).split(' ')
    .filter(x => x.length > 3 && !STOP.has(x)))).slice(0, 12);
  const ranked = catalog.map(item => {
    const name = normalize(item.nome);
    const category = normalize(item.categoria).replaceAll('_', ' ');
    const domain = normalize(new URL(item.url).hostname);
    const score = terms.reduce((sum, word) => sum +
      (name.includes(word) ? 5 : 0) +
      (category.includes(word) ? 3 : 0) +
      (domain.includes(word) ? 2 : 0), 0);
    return { item, score };
  }).filter(x => x.score > 1).sort((a, b) => b.score - a.score);
  return ranked.slice(0, 3).map(x => ({ name: x.item.nome, url: x.item.url }));
}

function answer(text: string, topic: string, question: string,
  method: NativeAnswer['method'] = 'guided'): NativeAnswer {
  return {
    text, topic, method, sources: suggestedSources(question, topic), engine: 'REZ Native',
  };
}

function pythonProject(query: string, mode: NativeMode): string {
  const simple = /calculadora|conta|calculo|opera[cç][oõ]es/.test(query);
  if (simple) {
    return '**Projeto Python: Calculadora de terminal**\n\n' +
      'Crie um arquivo chamado calculadora.py, cole o código e execute com Python 3:\n\n' +
      calculator + '\n\n' +
      'O projeto exercita funções, parâmetros, retorno, condicionais e tratamento de erros.';
  }
  if (includesAny(query, ['dados','pandas','vendas','dashboard','planilha','analise'])) {
    return '**Projeto Python: Análise de vendas**\n\n' +
      'Instale pandas no seu ambiente virtual e crie analise_vendas.py:\n\n' +
      pandasExample + '\n\n' +
      'Próxima etapa: trocar os dados de exemplo por um CSV real, validar colunas e criar gráficos.';
  }
  return '**Projeto Python: Gerenciador de tarefas com salvamento em JSON**\n\n' +
    'Você pode começar hoje, sem chave de API e sem instalar bibliotecas extras. ' +
    'Crie um arquivo chamado tarefas.py e execute com Python 3:\n\n' +
    taskManager + '\n\n' +
    '**O que você aprende:** listas, dicionários, funções, condicionais, laços, ' +
    'tratamento de erros e gravação de arquivos. O programa salva os dados em tarefas.json.\n\n' +
    (mode === 'study'
      ? 'Exercício: acrescente uma opção para excluir uma tarefa e explique a diferença entre listas e dicionários.'
      : 'Evolução sugerida: adicionar exclusão de tarefas, testes e uma interface web com Flask ou FastAPI.');
}

function identifyUserName(history: NativeTurn[]): string | null {
  const recent = history.slice(-12);
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].role !== 'user') continue;
    const match = recent[i].content.match(
      /\b(?:meu nome [ée]|pode me chamar de)\s+([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+){0,3})/i
    );
    if (match) return match[1].trim().slice(0, 70);
  }
  return null;
}

function calculate(question: string): string | null {
  // Simple bounded binary arithmetic; never use eval or arbitrary code.
  const text = normalize(question).replace(/,/g, '.');
  const found = text.match(/(?:^| )(-?\d{1,10}(?:\.\d{1,6})?)\s*(\+|\-|\*|\/|x|vezes|dividido por)\s*(-?\d{1,10}(?:\.\d{1,6})?)(?:$| )/);
  if (!found) return null;
  const a = Number(found[1]), b = Number(found[3]);
  const operator = found[2];
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  let result: number;
  switch (operator) {
    case '+': result = a + b; break;
    case '-': result = a - b; break;
    case '*': case 'x': case 'vezes': result = a * b; break;
    default:
      if (b === 0) return 'Não é possível dividir por zero.';
      result = a / b;
  }
  if (!Number.isFinite(result) || Math.abs(result) > 1e20) return null;
  return 'Resultado: ' + new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 8 }).format(result) + '.';
}

function summaryOf(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim().slice(0, 15000);
  if (cleaned.length < 60)
    return 'Envie um texto com pelo menos algumas frases para eu criar um resumo extrativo. ' +
      'Este motor seleciona trechos existentes; ele não inventa interpretações.';
  const sentences = cleaned.match(/[^.!?]+[.!?]?/g)?.map(s => s.trim()).filter(Boolean) || [];
  if (!sentences.length) return 'Não consegui encontrar frases suficientes para resumir.';
  const tokens = cleaned.toLowerCase().match(/[a-zà-ÿ]{4,}/g) || [];
  const freq = new Map<string, number>();
  tokens.filter(t => !STOP.has(normalize(t))).forEach(t => freq.set(t, (freq.get(t) || 0) + 1));
  const scores = sentences.map((sentence, i) => {
    const words = sentence.toLowerCase().match(/[a-zà-ÿ]{4,}/g) || [];
    const score = words.reduce((sum, w) => sum + (freq.get(w) || 0), 0) /
      Math.sqrt(Math.max(words.length, 1)) + (i === 0 ? 2 : 0);
    return { sentence, score, i };
  });
  const limit = Math.min(3, Math.max(1, Math.ceil(sentences.length / 3)));
  const selected = scores.sort((a, b) => b.score - a.score)
    .slice(0, limit).sort((a, b) => a.i - b.i);
  return '**Resumo extrativo (frases selecionadas do texto enviado):**\n\n' +
    selected.map(x => '• ' + x.sentence).join('\n') +
    '\n\nEste é um resumo estatístico simples, não uma interpretação produzida por um LLM.';
}

export function nativeAnswer(history: NativeTurn[], mode: NativeMode = 'general',
  documentContext = ''): NativeAnswer {
  const last = history.at(-1);
  if (!last || last.role !== 'user' || !last.content.trim())
    return answer('Escreva uma pergunta para começar.', 'ajuda', '');
  const query = last.content.slice(0, 4000);
  const q = normalize(query);
  const previous = history.slice(0, -1).filter(x => x.role === 'user')
    .slice(-6).map(x => normalize(x.content)).join(' ');

  const calc = calculate(query);
  if (calc !== null) return answer(calc, 'matemática', query, 'calculation');

  if (/^(oi|ola|opa|e ai|bom dia|boa tarde|boa noite)( |$)/.test(q))
    return answer('Olá! Sou a REZ A.I, usando o REZ Native: um motor de respostas criado neste projeto, executado no servidor sem chave de API. ' +
      'Posso ajudar com programação, matemática básica e temas do meu catálogo. ' +
      'Para perguntas abertas fora da base, vou indicar minhas limitações.', 'ajuda', query);

  if (includesAny(q, ['qual seu nome','quem e voce','como se chama']))
    return answer('Sou a REZ A.I. No modo Nativo, uso regras, exemplos escritos para o projeto e uma base de referências. ' +
      'Não estou executando um modelo de linguagem de grande porte.', 'identidade', query);

  if (includesAny(q, ['qual e meu nome','sabe meu nome','lembra meu nome','qual meu nome'])) {
    const name = identifyUserName(history);
    return answer(name ? 'Você me disse nesta conversa que seu nome é ' + name + '.'
      : 'Você ainda não me disse seu nome nesta conversa. Não vou inventar.', 'memória', query);
  }

  const wantsSummary = mode === 'summary' || /^(resum[aeo]|fa[cç]a um resumo|sintetize)/.test(q);
  if (wantsSummary) {
    const source = documentContext.trim() ||
      query.replace(/^(resum[aeo]|fa[cç]a um resumo(?: de)?|sintetize)\s*:?\s*/i, '');
    return answer(summaryOf(source), 'resumo', query, 'extractive');
  }

  const pythonContext = includesAny(q, ['python','py ','pandas']) ||
    (!includesAny(q, ['javascript','java ','html','css','sql']) && includesAny(previous, ['python','projeto em python']));
  if (includesAny(q, ['projeto','aplicativo','programa ','sistema ', 'criar um bot']) && pythonContext)
    return answer(pythonProject(q, mode), 'python', query);

  if ((includesAny(q, ['continuar','melhorar','mais funcionalidade','como salvo','salvar dados','banco de dados','adicionar banco']) && pythonContext) &&
      includesAny(previous, ['projeto','tarefas','python'])) {
    return answer('Para evoluir seu projeto em Python, comece com o salvamento JSON do exemplo anterior. ' +
      'Quando precisar de consultas e relacionamentos, use SQLite, que já vem com Python:\n\n' +
      codeBlockSqlite() +
      '\n\nSepare o código em funções para cadastrar, listar e atualizar os registros. ' +
      'Depois adicione testes automatizados para não perder dados.', 'python', query);
  }

  if (includesAny(q, ['recurs','caso base','funcao iterativa','função iterativa'])) {
    return answer('**Recursão** é quando uma função chama a si mesma. Ela precisa de um **caso-base** ' +
      'para parar e de um passo que se aproxime desse caso-base.\n\n' +
      recursionExample + '\n\n' +
      'Versão iterativa equivalente: use um laço while que decrementa n enquanto n > 0. ' +
      'Se a chamada recursiva vier antes do print, a saída pode aparecer em ordem crescente.', 'recursão', query);
  }

  if (includesAny(q, ['return','retorno da funcao','retorna valor','devolve um valor'])) {
    return answer('**return** devolve um valor da função para quem a chamou. ' +
      'Já **print** apenas exibe na tela. Depois do return, a função encerra aquela chamada.\n\n' +
      returnExample, 'python return', query);
  }

  if (includesAny(q, ['listas e funcoes','lista e funcao','listas python','lista em python','media de notas','lista de valores'])) {
    return answer('Uma **lista** guarda vários valores. Uma função pode receber a lista como argumento ' +
      'e devolver um resultado, sem precisar usar variáveis globais:\n\n' +
      listFunctionsExample + '\n\nO exemplo trata a lista vazia para evitar divisão por zero.', 'python listas', query);
  }

  if (includesAny(q, ['projeto']) && includesAny(q, ['javascript','site','pagina web','html','css']))
    return answer('Para começar um projeto web simples, crie index.html e abra no navegador:\n\n' +
      htmlExample + '\n\nEm seguida, coloque CSS em um arquivo style.css e JavaScript em app.js.', 'web', query);

  if (includesAny(q, ['sql','banco de dados','foreign key','primary key','chave primaria','chave estrangeira','join','mer','der'])) {
    return answer('Em bancos de dados relacionais, a **chave primária (PK)** identifica a linha ' +
      'e a **chave estrangeira (FK)** referencia uma linha de outra tabela. ' +
      'Um JOIN combina tabelas com base em uma condição:\n\n' +
      sqlExample + '\n\nO exemplo representa um relacionamento cliente 1:N pedidos. ' +
      'Para relacionamentos N:N, utilize uma tabela associativa.', 'banco de dados', query);
  }

  if (includesAny(q, ['pandas','dataframe','analise de dados','análise de dados','power bi','dashboard','csv'])) {
    return answer('Para trabalhar com dados, comece carregando uma tabela, validando os tipos ' +
      'e agrupando informações. Em Python, pandas é uma opção comum:\n\n' +
      pandasExample + '\n\nPara usar dados reais, leia um CSV com pd.read_csv e trate ausências ' +
      'antes de gerar visualizações. O Power BI pode consumir um CSV exportado.', 'dados', query);
  }

  if (includesAny(q, ['javascript','node js','nodejs','react','frontend','front end'])) {
    return answer('JavaScript executa lógica no navegador e, com Node.js, também no servidor. ' +
      'React é uma biblioteca de interfaces que utiliza JavaScript ou TypeScript.\n\n' +
      jsExample + '\n\nPara começar, aprenda variáveis, funções, eventos e requisições HTTP; ' +
      'depois passe para componentes React.', 'javascript', query);
  }

  if (includesAny(q, ['html','css','criacao de site','criar site'])) {
    return answer('HTML estrutura a página; CSS controla aparência e responsividade; ' +
      'JavaScript adiciona comportamento interativo.\n\n' +
      htmlExample + '\n\nComece por HTML semântico, depois Flexbox e Grid.', 'web', query);
  }

  if (includesAny(q, ['algoritmo','estrutura de dados','complexidade','big o'])) {
    return answer('**Algoritmo** é uma sequência de passos para resolver um problema. ' +
      '**Estrutura de dados** organiza os valores usados nesses passos. ' +
      'Complexidade Big O descreve como o custo tende a crescer com o tamanho da entrada.\n\n' +
      'Exemplos: acessar um item de lista pelo índice é O(1), percorrer n itens é O(n), ' +
      'e busca binária em dados ordenados é O(log n). ' +
      'Se disser qual algoritmo, explico um exemplo concreto.', 'algoritmos', query);
  }

  if (includesAny(q, ['inteligencia artificial','machine learning','llm','modelo de linguagem','treinar ia','cerebro proprio'])) {
    return answer('**Uma IA generativa e um motor de regras são tecnologias diferentes.** ' +
      'O REZ Native é nosso motor programado de respostas e recuperação de referências; ' +
      'ele não foi treinado para gerar linguagem aberta como um LLM.\n\n' +
      'Para construir um modelo gerativo próprio, seria necessário selecionar pesos abertos, ' +
      'obter dados de treinamento licenciados, treinar ou ajustar com recursos computacionais ' +
      'e hospedar a inferência. Links e perguntas sem respostas não treinam o modelo por si só.', 'inteligência artificial', query);
  }

  if (includesAny(q, ['fotossintese','fotossíntese'])) {
    return answer('**Fotossíntese** é o processo em que plantas, algas e algumas bactérias ' +
      'convertem energia luminosa em energia química. Em plantas, água e gás carbônico ' +
      'participam da produção de compostos orgânicos, com liberação de oxigênio. ' +
      'Ela ocorre principalmente nos cloroplastos, que contêm clorofila.', 'biologia', query);
  }

  if (includesAny(q, ['revolucao francesa','revolução francesa'])) {
    return answer('A **Revolução Francesa** começou em 1789. Entre suas causas estavam ' +
      'a crise financeira, a desigualdade entre os estamentos e ideias do Iluminismo. ' +
      'Ela enfraqueceu o Antigo Regime e influenciou debates sobre cidadania e direitos.', 'história', query);
  }

  if (includesAny(q, ['seguranca digital','segurança digital','senha forte','phishing'])) {
    return answer('Para melhorar a segurança digital: use senhas exclusivas em um gerenciador, ' +
      'ative autenticação multifator, atualize seus aplicativos e confira domínios antes de ' +
      'inserir dados pessoais. Mensagens com urgência artificial e links inesperados ' +
      'podem ser tentativas de phishing.', 'segurança digital', query);
  }

  if (includesAny(q, ['erro no codigo','erro python','traceback','syntaxerror','indentationerror'])) {
    return answer('Consigo ajudar a investigar erros comuns: IndentationError normalmente envolve ' +
      'recuo inconsistente; SyntaxError pode indicar dois-pontos ou parênteses ausentes; ' +
      'TypeError aparece quando uma operação recebe tipos incompatíveis.\n\n' +
      'Cole o trecho mínimo do código e o texto completo do erro (sem senhas) ' +
      'para uma análise mais específica. Este motor não executa seu código.', 'depuração', query);
  }

  if (includesAny(q, ['projeto em python','crie em python','aprender python','programar em python']))
    return answer(pythonProject(q, mode), 'python', query);

  if (includesAny(q, ['oi','opa']) && q.length < 10)
    return answer('Olá! Eu sou a REZ Native. Posso criar exemplos de Python, explicar SQL ' +
      'e ajudar com conceitos presentes na minha base.', 'ajuda', query);

  const sources = suggestedSources(query);
  if (sources.length > 0) {
    return {
      text: 'Ainda não tenho uma explicação verificada e detalhada para essa pergunta no meu motor nativo. ' +
        'Encontrei **links de referência relacionados** no catálogo da REZ, mas não li o conteúdo dessas páginas. ' +
        'Use o painel Fontes para pesquisar e conferir o material original.',
      topic: 'referências',
      method: 'fallback',
      sources,
      engine: 'REZ Native',
    };
  }
  return answer('Ainda não sei responder a essa pergunta com segurança no meu motor nativo. ' +
    'Ele é gratuito e rápido porque usa regras e conhecimento previamente organizado, ' +
    'não um modelo generativo de propósito geral. Posso ajudar com Python, SQL, algoritmos, ' +
    'dados, matemática básica e exemplos de projetos. Se você especificar o assunto, ' +
    'posso verificar se tenho material adequado.', 'limite do motor', query, 'fallback');
}

function codeBlockSqlite(): string {
  const tick = String.fromCharCode(96).repeat(3);
  return tick + 'python\n' + [
    'import sqlite3',
    "with sqlite3.connect('projeto.db') as conexao:",
    "    conexao.execute('CREATE TABLE IF NOT EXISTS tarefas (id INTEGER PRIMARY KEY, titulo TEXT NOT NULL)')",
    "    conexao.execute('INSERT INTO tarefas (titulo) VALUES (?)', ('Estudar Python',))",
    "    for linha in conexao.execute('SELECT id, titulo FROM tarefas'):",
    '        print(linha)',
  ].join('\n') + '\n' + tick;
}
