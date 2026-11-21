import test from 'node:test';
import assert from 'node:assert/strict';
import { pythonSnippet } from '../app/rez-native-python';
import { nativeAnswer } from '../app/rez-native-core';
import { POST } from '../app/api/rez-native/route';

const user = (content: string) => [{ role: 'user' as const, content }];

test('exact screenshot request outputs print("OI") instead of unrelated site links', () => {
  const result = nativeAnswer(user('me manda um codigo em python que imprima OI'));
  assert.equal(result.method, 'guided');
  assert.equal(result.topic, 'python');
  assert.match(result.text, /print\("OI"\)/);
  assert.match(result.text, /python\nprint\(/);
  assert.doesNotMatch(result.text, /não tenho uma explicação|links de referência/);
});

test('recognizes diverse natural Portuguese phrasings, preserving intended capitalization', () => {
  const prompts = [
    ['Me manda um código em Python que imprima OI', 'print("OI")'],
    ['Escreva em Python um programa que imprima Olá Mundo', 'print("Olá Mundo")'],
    ['Quero um script python que mostre "REZ A.I!"', 'print("REZ A.I!")'],
    ['como faço para imprimir BOM DIA em python?', 'print("BOM DIA")'],
    ['Me dá um exemplo em python que exiba Teste', 'print("Teste")'],
    ['Em python, use print para mostrar "Olá!"', 'print("Olá!")'],
    ['Faça um código que imprima OI na tela', 'print("OI")'],
    ['print OI', 'print("OI")'],
  ] as const;
  for (const [question, expression] of prompts) {
    const result = pythonSnippet(question);
    assert.ok(result, 'should generate code for: ' + question);
    assert.ok(result.code.includes(expression),
      'wrong output for ' + question + ': ' + result.code);
  }
});

test('quotes strings safely without adding executable user-controlled source code', () => {
  const example = pythonSnippet('Em Python imprima "OI; __import__(os).system("');
  assert.ok(example);
  // All user text must remain inside one quoted string.
  assert.ok(example.code.includes('python\nprint('));
  assert.ok(!example.code.includes('\n__import__'));
  const malicious = pythonSnippet('em python imprima OI\nimport os\nos.system("echo hi")');
  assert.ok(malicious);
  assert.equal((malicious.code.match(/\nprint\(/g) || []).length, 1);
  assert.ok(!malicious.code.includes('\nimport os\n'));
});

test('simple arithmetic should still be calculated, without unsolicited code', () => {
  const reply = nativeAnswer(user('Quanto é 2 + 3?'));
  assert.equal(reply.method, 'calculation');
  assert.match(reply.text, /5/);
});

test('Python multiplication tables and number ranges produce useful loops', () => {
  const table = nativeAnswer(user('Me faça um código em Python para mostrar a tabuada do 5'));
  assert.match(table.text, /numero = 5/);
  assert.match(table.text, /range\(1, 11\)/);
  const count = nativeAnswer(user('Em Python imprima os números de 1 até 10'));
  assert.match(count.text, /for numero in range\(1, 11, 1\)/);
  const even = nativeAnswer(user('Em python imprima os números pares de 2 a 10'));
  assert.match(even.text, /numero % 2 == 0/);
});

test('Python input and sum beginner examples are valid code templates', () => {
  const name = nativeAnswer(user('Faça em Python um programa que peça o nome do usuário'));
  assert.match(name.text, /input\("Qual é o seu nome/);
  const sum = nativeAnswer(user('Código em python para somar dois números'));
  assert.match(sum.text, /primeiro = float\(input/);
  assert.match(sum.text, /resultado = primeiro \+ segundo/);
});

test('other languages do not accidentally get a Python example', () => {
  assert.equal(pythonSnippet('Quero código JavaScript para imprimir OI'), null);
  assert.equal(pythonSnippet('Crie uma tabela SQL com id e nome'), null);
});

test('native chat API returns new code without contacting any AI provider', async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = (async () => {
    requests++;
    throw new Error('Unexpected external fetch');
  }) as typeof fetch;
  try {
    const request = new Request('https://rez.example/api/rez-native', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://rez.example' },
      body: JSON.stringify({
        mode: 'general', messages: user('me manda um codigo em python que imprima OI'),
        allowPublicResearch: true,
      }),
    });
    const response = await POST(request);
    assert.equal(response.status, 200);
    const payload = await response.json() as { text: string; method: string };
    assert.match(payload.text, /print\("OI"\)/);
    assert.equal(payload.method, 'guided');
    assert.equal(requests, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
