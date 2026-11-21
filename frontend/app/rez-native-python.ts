/**
 * Deterministic REZ Python intent builder.
 * Handles basic code requests with original, syntactically valid examples
 * rather than claiming a general-purpose LLM was trained.
 *
 * Never eval, execute or import user code. Literal strings are safely quoted.
 */
import { codeBlock } from './rez-native-examples';

export type PythonSnippet = { label: string; explanation: string; code: string };

const normalize = (value: string) => value.toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

function wantsCode(value: string): boolean {
  const text = normalize(value);
  return /\b(python|codigo|código|script|programa|programar|print|printar|imprima|imprimir|imprime|printe|exiba|exibir|mostre|mostrar|tabuada)\b/i.test(text);
}

function make(label: string, explanation: string, lines: string[]): PythonSnippet {
  return { label, explanation, code: codeBlock('python', lines) };
}

function pythonTextLiteral(raw: string): string {
  // JSON string syntax for normal printable strings is also a safe Python
  // double-quoted literal. Quotes, backslashes and line breaks are escaped.
  return JSON.stringify(raw);
}

function quotedPayload(text: string): string | null {
  const match = text.match(/["“‘']([^"”’']{1,150})["”’']/);
  return match?.[1] ?? null;
}

function outputPayload(query: string): string | null {
  const match = query.match(/\b(?:imprima|imprimir|imprime|printar|printe|print|exiba|exibir|mostre|mostrar|escreva|escrever|diga)\b([\s\S]*)$/i);
  if (!match) return null;
  const quoted = quotedPayload(match[1]);
  if (quoted) return quoted;
  let rest = match[1].trim();
  rest = rest.replace(/^(?:na|no)\s+(?:tela|terminal|console)\s*/i, '');
  rest = rest.replace(/^(?:a|o|as|os|um|uma)\s+(?:palavra|frase|mensagem|texto|string|numero|número)\s*/i, '');
  rest = rest.replace(/^(?:que\s+(?:diz|seja|contenha)|de|com|dizendo|escrito|igual\s+a)\s+/i, '');
  rest = rest.replace(/^(?:a|o)\s+seguinte\s*/i, '');
  rest = rest.replace(/\s+(?:no\s+terminal|na\s+tela|no\s+console|em\s+python|no\s+python)\s*\??$/i, '');
  rest = rest.replace(/\s*(?:\?|[.!])+\s*$/g, '').trim();
  if (!rest || rest.length > 120) return null;
  if (/^(?:um|uma|algo|qualquer|texto|mensagem|palavra|nome)$/i.test(rest)) return null;
  return rest;
}

export function pythonSnippet(question: string): PythonSnippet | null {
  const raw = question.trim().slice(0, 500);
  if (!wantsCode(raw)) return null;
  const q = normalize(raw);
  const mentionsPython = /\b(python|codigo|script|programa|print)\b/.test(q);
  // Avoid applying Python snippets to explicit SQL / JavaScript / HTML tasks.
  if (/\b(javascript|java|html|css|typescript|sql|c\+\+)\b/.test(q) &&
      !/\bpython\b/.test(q)) return null;

  // Math-table and numbered loops must be checked BEFORE generic printing.
  const tabuada = q.match(/\btabuada\s+(?:do|da|de)\s+(\d{1,3})\b/);
  if (tabuada && Number(tabuada[1]) <= 100) {
    const n = Number(tabuada[1]);
    return make('Tabuada em Python',
      'O laço for repete a operação de 1 a 10.',
      ['numero = ' + n, 'for i in range(1, 11):',
       '    print(f"{numero} x {i} = {numero * i}")']);
  }
  const range = q.match(/\b(?:de|do)\s+(\d{1,5})\s+(?:ate|a)\s+(\d{1,5})\b/);
  if (range && /\b(imprima|imprimir|imprime|mostre|mostrar|exiba|contar|conte|numeros|numeros pares|laco|for)\b/.test(q)) {
    const begin = Number(range[1]), end = Number(range[2]);
    if (Math.abs(end - begin) <= 1000) {
      const step = begin <= end ? 1 : -1;
      const even = /\bpares\b/.test(q);
      return make(even ? 'Números pares com Python' : 'Contagem com Python',
        'range gera uma sequência; o fim precisa incluir o último número.',
        [
          'for numero in range(' + begin + ', ' + (end + step) + ', ' + step + '):',
          ...(even ? ['    if numero % 2 == 0:', '        print(numero)'] : ['    print(numero)']),
        ]);
    }
  }

  if (/\b(?:pe[çc]a|pergunte|solicite|leia)\b.*\b(?:nome|usuario|usuário)\b/.test(q) ||
      (/\binput\b/.test(q) && /\bnome\b/.test(q))) {
    return make('Entrada e saída em Python',
      'input lê o nome digitado e a f-string mostra uma mensagem personalizada.',
      ['nome = input("Qual é o seu nome? ")', 'print(f"Olá, {nome}!")']);
  }

  if (/\b(?:somar|soma|some|somasse|adicionar)\b.*\b(?:dois|2)\s+(?:numeros|valores)\b/.test(q) &&
      mentionsPython) {
    return make('Somando dois números em Python',
      'input lê texto; float converte os valores antes de somar.',
      ['primeiro = float(input("Digite o primeiro número: "))',
       'segundo = float(input("Digite o segundo número: "))',
       'resultado = primeiro + segundo',
       'print(f"Resultado: {resultado}")']);
  }

  // Explicit programming request: "me manda um código em python que imprima OI".
  // Use the original capitalization in the intended literal.
  if (/\b(?:imprima|imprimir|imprime|printar|printe|print|exiba|exibir|mostre|mostrar|escreva|escrever|diga)\b/i.test(raw)) {
    const value = outputPayload(raw);
    if (value) {
      // Asking to print a variable (rather than a string) gets a variable example.
      if (/^(?:o\s+)?(?:valor\s+da?\s+)?vari[aá]vel\b/i.test(value)) {
        return make('Imprimindo uma variável em Python',
          'Primeiro criamos a variável, depois mostramos seu conteúdo com print.',
          ['mensagem = "Olá, REZ!"', 'print(mensagem)']);
      }
      if (/\b(?:ola mundo|ol[aá] mundo|hello world)\b/i.test(value)) {
        const exact = quotedPayload(raw) ?? value;
        return make('Olá Mundo em Python', 'print exibe uma mensagem no terminal.',
          ['print(' + pythonTextLiteral(exact) + ')']);
      }
      if (!/\b(?:codigo|código|projeto|funcao|função|exemplo|vari[aá]vel|loop|laco|laço|numeros\s+(?:de|do))\b/i.test(value)) {
        return make('Imprimindo texto em Python',
          'A função print mostra esse texto no terminal. Salve como exemplo.py e execute com Python 3.',
          ['print(' + pythonTextLiteral(value) + ')']);
      }
    }
    if (mentionsPython || /\bimprima\b/.test(q)) {
      return make('Exibindo uma mensagem em Python',
        'Use print para mostrar mensagens no terminal.',
        ['print("Olá, mundo!")']);
    }
  }

  if (/\b(?:ola mundo|hello world)\b/.test(q) && mentionsPython) {
    return make('Olá Mundo em Python', 'O primeiro programa em Python pode usar só print.',
      ['print("Olá, mundo!")']);
  }

  // "Como usar print em Python" (without requesting a specific output).
  if (/\bprint\b/.test(q) && mentionsPython) {
    return make('Como funciona print em Python',
      'print mostra texto, números ou o resultado de uma expressão.',
      ['print("OI")', 'print(2 + 3)', 'nome = "REZ"', 'print(f"Olá, {nome}!")']);
  }

  return null;
}

export function explainPythonSnippet(snippet: PythonSnippet): string {
  return '**' + snippet.label + '**\n\n' + snippet.explanation + '\n\n' +
    snippet.code + '\n\n' +
    'Esse exemplo é gerado pelo motor próprio de programação da REZ, sem depender de outra IA.';
}
