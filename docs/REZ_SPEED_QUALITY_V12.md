# REZ A.I v1.2 — Qualidade e desempenho sem API

Esta versão responde ao problema reportado: a REZ caía na CPU, demorava e repetia palavras sem sentido.

## Mudanças implementadas

- **GPU primeiro:** seleção do adaptador com preferência por alto desempenho. Em WebGPU com shader-f16, tenta Qwen2.5 0.5B; sem esse recurso, usa o modelo compatível SmolLM2 360M. Depende do navegador e da placa gráfica.
- **CPU com melhor coerência:** substitui SmolLM2 135M por Qwen2.5 0.5B Instruct ONNX quantizado em 4 bits. A qualidade tende a melhorar, mas **a inferência por CPU pode ficar MAIS lenta** e exigir mais memória.
- **Redução de repetição:** penalidade por repetição, bloqueio de n-gramas e detector local que interrompe texto degenerado, como "ajudar, ajudar, ajudar".
- **Respostas proporcionais:** a CPU limita a saída a 128 tokens em perguntas comuns e até 200 em código; WebGPU limita a 240 tokens. Respostas longas podem ser cortadas.
- **Interface mais leve:** fragmentos de resposta são agrupados em atualizações a cada 100 milissegundos para evitar renderizar toda a conversa por token.
- **Português informal instantâneo:** expressões como "como vc tá" usam respostas rápidas determinísticas, marcadas explicitamente como tais.
- **Diagnóstico:** status mostra GPU ou CPU e informa que o processamento por CPU pode ser lento.

## O que NÃO muda

A REZ continua sem API de inferência, chave ou cartão. Os modelos baixam pesos públicos pela internet na primeira utilização e rodam na GPU/CPU do visitante. O aplicativo não treina um modelo fundamental próprio e não se compara em capacidade aos maiores modelos comerciais.

## Como validar

1. Abra a REZ atualizada e envie "como vc ta". A resposta rápida deve ser imediata e identificada como tal.
2. Em nova conversa, envie "Explique a diferença entre listas e tuplas em Python, com um exemplo." O primeiro download pode demorar; confirme se o status mostra WebGPU ou CPU.
3. Observe se a resposta evita repetições e se o botão de parada funciona.
4. Se o motor cair para a CPU no Brave/Chrome, confira a aceleração por hardware do navegador e os drivers de vídeo. WebGPU depende do dispositivo.
5. Confirme os testes com npm test e npm run build. Essas verificações não executam inferência real na GPU do visitante.

## Fontes

- Qwen2.5 0.5B Instruct ONNX: https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct
- Transformers.js quantização: https://huggingface.co/docs/transformers.js/guides/dtypes
- Parâmetros contra repetição: https://huggingface.co/docs/transformers.js/api/utils/generation
- WebLLM modelos: https://webllm.mlc.ai/models/

## Próximos passos de desempenho

Para alta qualidade e velocidade simultaneamente, serão necessários hardware WebGPU compatível ou um servidor com poder computacional suficiente. Não há solução genuína com zero uso de memória e inferência ilimitada. A CPU é alternativa de compatibilidade, não substitui uma GPU veloz.
