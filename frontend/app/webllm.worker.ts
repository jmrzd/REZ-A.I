import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

// Runs heavyweight GPU model inference outside the React render thread.
// All generation remains on this visitor's device.
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (message: MessageEvent) => {
  handler.onmessage(message);
};
