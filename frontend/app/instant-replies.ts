/**
 * Deterministic offline quick replies. NOT language-model inference.
 * The wording reflects the user's currently selected Nuvem / Local mode.
 */
export type InstantAnswer = { text: string; kind: 'instant' };
export type ExecutionMode = 'native' | 'cloud' | 'local';

export function instantAnswer(
  text: string, now: Date = new Date(), mode: ExecutionMode = 'cloud',
): InstantAnswer | null {
  const normalized = text.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[!?.,;:]+/g, ' ').replace(/\s+/g, ' ').trim();
  const reply = (answer: string): InstantAnswer => ({ text: answer, kind: 'instant' });
  const engineDescription = mode === 'native'
    ? 'No modo Nativo, respondo usando o motor próprio de regras e referências da REZ, hospedado no site. Não sou um LLM de uso geral.'
    : mode === 'cloud'
      ? 'Para perguntas mais completas, a REZ usa um modelo no servidor Cloudflare quando ele estiver conectado, sem baixar pesos no seu computador.'
      : 'Para perguntas mais completas, a REZ usa um modelo aberto no seu dispositivo, após o download inicial dos pesos.';

  if (/^(que horas sao|que horas e|qual e a hora|qual a hora|me diga as horas|horas|que hora e agora|que horas sao agora)$/.test(normalized)) {
    const clock = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(now);
    return reply('Agora são ' + clock + ' no horário configurado no seu dispositivo.');
  }
  if (/^(oi+|oie+|ola+|e ai|eae|hey|hello|hi|opa)$/.test(normalized))
    return reply('Oi! Eu sou a REZ A.I. Posso ajudar com estudos, programação e documentos. ' + engineDescription);
  if (/^(qual (e )?seu nome|como voce se chama|como vc se chama|quem e voce|quem e vc)$/.test(normalized))
    return reply('Meu nome é REZ A.I. Sou um aplicativo independente de assistência com IA. ' + engineDescription);
  if (/^(bom dia|boa tarde|boa noite)$/.test(normalized))
    return reply('Olá! Como posso ajudar você hoje?');
  if (/^(tudo bem|tudo bom|como vai|como voce esta|como vc ta|como voce ta|como vc esta|como c ta|como ta|ta tudo bem|vc ta bem|ta funcionando|voce funciona)$/.test(normalized))
    return reply('Estou disponível! Mensagens simples como esta recebem respostas rápidas do aplicativo. ' + engineDescription);
  if (/^(obrigado|obrigada|valeu|vlw|brigado|brigada)$/.test(normalized))
    return reply('Por nada! Quando quiser, pode enviar outra pergunta.');
  if (/^(ajuda|help|o que voce faz|o que consegue fazer|quais suas funcoes)$/.test(normalized))
    return reply('Sou a REZ A.I, um aplicativo de chat e consulta de documentos. ' +
      'Posso ajudar com programação, escrita, explicações e busca na memória de documentos. ' +
      engineDescription);
  return null;
}
