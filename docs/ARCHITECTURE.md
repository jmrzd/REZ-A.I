# Arquitetura — Rez A.I

## Objetivo
Construir uma plataforma de IA independente da interface e do provedor, capaz de alternar entre modelos locais e serviços hospedados. A implementação atual é um **MVP**; o diagrama futuro não representa recursos já existentes.

## MVP 0.1
- **Frontend:** Next.js / TypeScript, chat e histórico temporário no `localStorage`.
- **Backend:** FastAPI com `GET /health` e `POST /chat`.
- **Provedor local:** Ollama, usando `OLLAMA_URL` e `OLLAMA_MODEL` definidos no servidor.
- **Provedor de nuvem:** API OpenAI com `OPENAI_API_KEY` e `OPENAI_MODEL` no servidor.
- **Seleção:** manual, feita pela interface.

## API inicial
`POST /chat` recebe:

```json
{
  "provider": "local",
  "messages": [
    { "role": "user", "content": "Olá, Rez A.I!" }
  ]
}
```

A resposta bem-sucedida tem o formato `{"reply":"..."}`. O corpo aceita até 30 mensagens, e cada mensagem tem limite de 12.000 caracteres. **Este contrato pode mudar durante a fase experimental.**

## Arquitetura pretendida
```text
Interface web / aplicativos
           |
      Rez Core API
      /    |     \
  Auth   Memória   Observabilidade
           |
   Orquestrador de modelos
     /      |       \
 Ollama   APIs     Ferramentas
     \      |       /
     Avaliações e políticas
```

## Critérios de evolução
1. Isolar provedores por adapters com contrato comum.
2. Implementar testes de integração e avaliação antes de trocar modelos.
3. Armazenar conversas com opt-in, exclusão e autenticação.
4. Medir latência, custo, uso de memória e qualidade por tarefa.
5. Implementar streaming, RAG e ferramentas com limites e permissões.
6. Só então adicionar roteamento dinâmico e agentes.

## Segurança
Nunca enviar chaves privadas ao frontend. Antes do deploy público, acrescentar autenticação, rate limiting, restrição de CORS por ambiente, logs sem informações sensíveis, validação de ferramentas e limites de custo.
