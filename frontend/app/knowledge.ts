/**
 * Private, local-first document collection and lightweight lexical RAG.
 * IndexedDB stores selected TXT, MD, CSV, JSON and code files in this browser.
 * No upload, no hosted embedding API, no GPU usage for the search index.
 *
 * This is lexical retrieval (a simple BM25-like score), not semantic vector RAG.
 */
export type LocalDocument = {
  id: string;
  name: string;
  content: string;
  createdAt: number;
};
export type Excerpt = { source: string; text: string; score: number };

const DATABASE = 'rez-ai-local-knowledge-v1';
const TABLE = 'documents';
export const MAX_DOC_BYTES = 250_000;
export const MAX_DOCS = 20;
const MAX_CONTEXT_CHARS = 3_200;
const STOP = new Set([
  'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na',
  'que', 'um', 'uma', 'para', 'por', 'com', 'e', 'ou', 'se', 'me', 'meu',
  'minha', 'como', 'qual', 'quais', 'sobre', 'esse', 'essa', 'este',
  'the', 'and', 'with', 'this', 'that', 'from', 'your', 'what', 'how',
]);

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined')
      return reject(new Error('Este navegador não oferece IndexedDB.'));
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TABLE))
        db.createObjectStore(TABLE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Não foi possível abrir a memória local.'));
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(TABLE, mode);
    const request = action(transaction.objectStore(TABLE));
    let result: T;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(new Error('Não foi possível acessar a memória local.'));
    transaction.oncomplete = () => { db.close(); resolve(result); };
    transaction.onerror = () => { db.close(); reject(new Error('Erro ao salvar dados locais.')); };
    transaction.onabort = () => { db.close(); reject(new Error('Operação interrompida.')); };
  });
}

export async function readDocuments(): Promise<LocalDocument[]> {
  const rows = await transact<LocalDocument[]>('readonly', store => store.getAll());
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveDocument(file: File): Promise<LocalDocument> {
  if (file.size > MAX_DOC_BYTES)
    throw new Error('Arquivo muito grande. Limite de 250 KB por documento.');
  if (!/\.(txt|md|csv|json|ts|tsx|js|py|sql|log)$/i.test(file.name))
    throw new Error('Formato não suportado. Use TXT, MD, CSV, JSON ou código.');
  const documents = await readDocuments();
  if (documents.length >= MAX_DOCS)
    throw new Error('O limite de 20 documentos foi atingido. Exclua um para continuar.');

  const content = await file.text();
  if (!content.trim()) throw new Error('O documento está vazio.');
  if (content.includes('\u0000'))
    throw new Error('Este arquivo parece binário. Use um documento de texto.');
  const document: LocalDocument = {
    id: crypto.randomUUID(),
    name: file.name.slice(0, 120),
    content: content.slice(0, MAX_DOC_BYTES),
    createdAt: Date.now(),
  };
  await transact('readwrite', store => store.put(document));
  return document;
}

export async function removeDocument(id: string): Promise<void> {
  await transact('readwrite', store => store.delete(id));
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .match(/[a-z0-9]{2,}/g) || []).filter(word => !STOP.has(word));
}

function chunkText(input: string, width = 760, overlap = 100): string[] {
  const cleaned = input.replace(/\r\n/g, '\n');
  const chunks: string[] = [];
  for (let i = 0; i < cleaned.length; i += width - overlap)
    chunks.push(cleaned.slice(i, i + width));
  return chunks;
}

export function searchDocuments(
  documents: LocalDocument[], question: string, maxResults = 4,
): Excerpt[] {
  const query = [...new Set(tokenize(question))].slice(0, 15);
  if (!query.length) return [];
  const chunks = documents.flatMap(d =>
    chunkText(d.content).map(text => ({ source: d.name, text })));
  if (!chunks.length) return [];
  const frequencies = chunks.map(chunk => {
    const count = new Map<string, number>();
    for (const word of tokenize(chunk.text))
      count.set(word, (count.get(word) || 0) + 1);
    return count;
  });
  const length = frequencies.map(words => [...words.values()].reduce((a, b) => a + b, 0));
  const averageLength = Math.max(1, length.reduce((a, b) => a + b, 0) / length.length);
  const docFrequency = new Map<string, number>();
  for (const word of query)
    docFrequency.set(word, frequencies.filter(row => row.has(word)).length);

  const matches: Excerpt[] = chunks.map((c, index) => {
    let score = 0;
    for (const word of query) {
      const freq = frequencies[index].get(word) || 0;
      if (!freq) continue;
      const docsWithWord = docFrequency.get(word) || 0;
      const idf = Math.log(1 + (chunks.length - docsWithWord + 0.5) / (docsWithWord + 0.5));
      score += idf * (freq * 2.2) /
        (freq + 1.2 * (0.25 + 0.75 * (length[index] / averageLength)));
    }
    return { source: c.source, text: c.text.trim(), score };
  });
  return matches.filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

export function buildLocalContext(
  documents: LocalDocument[], question: string,
): { context: string; sources: string[] } {
  const hits = searchDocuments(documents, question);
  const result: string[] = [];
  const names: string[] = [];
  let chars = 0;
  for (const hit of hits) {
    const body = '[Arquivo: ' + hit.source + ']\n' + hit.text;
    if (chars + body.length > MAX_CONTEXT_CHARS) break;
    result.push(body);
    chars += body.length;
    if (!names.includes(hit.source)) names.push(hit.source);
  }
  return {
    context: result.join('\n\n---\n\n'),
    sources: names,
  };
}
