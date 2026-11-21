/**
 * REZ Native: small audited, executable coding exercises.
 * These are our own examples, not copied from third-party model responses.
 */
const fence = String.fromCharCode(96).repeat(3);
export function codeBlock(language: string, lines: string[]): string {
  return fence + language + '\n' + lines.join('\n') + '\n' + fence;
}

export const taskManager = codeBlock('python', [
  'import json',
  'from pathlib import Path',
  '',
  "ARQUIVO = Path('tarefas.json')",
  '',
  'def carregar():',
  '    if not ARQUIVO.exists():',
  '        return []',
  '    try:',
  "        dados = json.loads(ARQUIVO.read_text(encoding='utf-8'))",
  '        return dados if isinstance(dados, list) else []',
  '    except (OSError, json.JSONDecodeError):',
  '        return []',
  '',
  'def salvar(tarefas):',
  "    ARQUIVO.write_text(json.dumps(tarefas, ensure_ascii=False, indent=2), encoding='utf-8')",
  '',
  'def main():',
  '    tarefas = carregar()',
  '    while True:',
  "        print('\\n1 - Adicionar | 2 - Listar | 3 - Concluir | 4 - Sair')",
  "        opcao = input('Escolha: ').strip()",
  "        if opcao == '1':",
  "            titulo = input('Nova tarefa: ').strip()",
  '            if titulo:',
  "                tarefas.append({'titulo': titulo, 'concluida': False})",
  '                salvar(tarefas)',
  "        elif opcao == '2':",
  '            if not tarefas:',
  "                print('Nenhuma tarefa cadastrada.')",
  '            for i, tarefa in enumerate(tarefas, 1):',
  "                status = 'OK' if tarefa['concluida'] else 'Pendente'",
  "                print(f'{i}. {tarefa[\"titulo\"]} - {status}')",
  "        elif opcao == '3':",
  '            try:',
  "                indice = int(input('Número da tarefa: ')) - 1",
  '            except ValueError:',
  "                print('Digite um número válido.')",
  '                continue',
  '            if 0 <= indice < len(tarefas):',
  "                tarefas[indice]['concluida'] = True",
  '                salvar(tarefas)',
  '            else:',
  "                print('Tarefa não encontrada.')",
  "        elif opcao == '4':",
  '            break',
  '        else:',
  "            print('Opção inválida.')",
  '',
  "if __name__ == '__main__':",
  '    main()',
]);

export const calculator = codeBlock('python', [
  'def calcular(a, operador, b):',
  "    if operador == '+':",
  '        return a + b',
  "    if operador == '-':",
  '        return a - b',
  "    if operador == '*':",
  '        return a * b',
  "    if operador == '/':",
  '        if b == 0:',
  "            raise ValueError('Não é possível dividir por zero.')",
  '        return a / b',
  "    raise ValueError('Operador inválido.')",
  '',
  'try:',
  "    a = float(input('Primeiro número: '))",
  "    operador = input('Operador (+ - * /): ').strip()",
  "    b = float(input('Segundo número: '))",
  "    print('Resultado:', calcular(a, operador, b))",
  'except ValueError as erro:',
  "    print('Erro:', erro)",
]);

export const recursionExample = codeBlock('python', [
  'def contagem(n):',
  '    if n <= 0:    # caso-base: encerra a recursão',
  '        return',
  '    print(n)',
  '    contagem(n - 1)',
  '',
  'contagem(5)  # imprime 5, 4, 3, 2, 1',
]);

export const listFunctionsExample = codeBlock('python', [
  'def media(notas):',
  '    if not notas:',
  '        return None',
  '    return sum(notas) / len(notas)',
  '',
  'notas = [7, 8, 9]',
  'resultado = media(notas)',
  "print(f'Média: {resultado:.2f}' if resultado is not None else 'Sem notas')",
]);

export const sqlExample = codeBlock('sql', [
  'CREATE TABLE clientes (',
  '  id INTEGER PRIMARY KEY,',
  '  nome VARCHAR(100) NOT NULL',
  ');',
  '',
  'CREATE TABLE pedidos (',
  '  id INTEGER PRIMARY KEY,',
  '  cliente_id INTEGER NOT NULL,',
  '  valor DECIMAL(10,2) NOT NULL,',
  '  FOREIGN KEY (cliente_id) REFERENCES clientes(id)',
  ');',
  '',
  'SELECT c.nome, p.valor',
  'FROM clientes AS c',
  'INNER JOIN pedidos AS p ON p.cliente_id = c.id;',
]);

export const pandasExample = codeBlock('python', [
  'import pandas as pd',
  '',
  "vendas = pd.DataFrame({'produto': ['A', 'B', 'A'], 'valor': [100, 80, 150]})",
  "resultado = vendas.groupby('produto', as_index=False)['valor'].sum()",
  'print(resultado)',
]);

export const jsExample = codeBlock('javascript', [
  'function somar(a, b) {',
  '  return a + b;',
  '}',
  '',
  'const resultado = somar(5, 4);',
  "console.log(resultado); // 9",
]);

export const htmlExample = codeBlock('html', [
  '<!doctype html>',
  '<html lang="pt-BR">',
  '<head>',
  '  <meta charset="utf-8">',
  '  <meta name="viewport" content="width=device-width,initial-scale=1">',
  '  <title>Minha página</title>',
  '  <style>body { font-family: system-ui; margin: 2rem; }</style>',
  '</head>',
  '<body>',
  '  <h1>Olá, REZ!</h1>',
  '  <p>Minha primeira página na web.</p>',
  '</body>',
  '</html>',
]);

export const returnExample = codeBlock('python', [
  'def somar(a, b):',
  '    return a + b',
  '',
  'resultado = somar(5, 4)',
  'print(resultado + 10)  # 19',
]);
