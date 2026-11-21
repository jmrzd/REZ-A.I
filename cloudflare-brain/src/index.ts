import { handleRequest, type BrainEnv } from './service';
export { UsageGate } from './usage-gate';
export { validateTurns, validateMode, handleRequest } from './service';

export default {
  fetch(request: Request, env: BrainEnv): Promise<Response> {
    return handleRequest(request, env);
  },
};
