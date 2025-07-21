import {
  NativeWorkerMessage,
  UserWorkerEventHandler,
  WorkerMessage,
} from './types';

export function sendMessageInClient<T>(msg: WorkerMessage<T>, worker: Worker) {
  return worker.postMessage(msg);
}

export function sendMessageInWorker<T>(
  receivedMsg: NativeWorkerMessage,
  response: T,
) {
  const msg: WorkerMessage<T> = {
    id: receivedMsg.data.id,
    data: response,
  };
  return postMessage(msg);
}

export function handleMessageInWorker<T, R>({
  handler,
}: {
  workerName: string;
  handler: UserWorkerEventHandler<T, R>;
}) {
  self.onmessage = (e: NativeWorkerMessage<T>) => {
    const res = handler(e.data.data);
    // const prefix = `[${workerName} worker]`;
    // const start = Date.now();

    if (res instanceof Promise) {
      res.then((r) => {
        // console.log(`${prefix}[async] duration: ${Date.now() - start}ms`);
        sendMessageInWorker(e, r);
      });
    } else {
      sendMessageInWorker(e, res);
      // console.log(`${prefix}[sync] duration: ${Date.now() - start}ms`);
    }
  };
}
