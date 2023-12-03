import { WorkerMessage, UserWorkerEventCallback, NativeWorkerMessage } from './types';
import { sendMessageInClient } from './utils';

export class ChildWorker {
  private timer = 0;

  private callbacks: Map<number | string, UserWorkerEventCallback> = new Map();

  constructor(protected worker: Worker) {
    this.setup();
  }

  protected setup() {
    this.worker.onmessage = (msg: NativeWorkerMessage) => {
      const { data } = msg;
      if (this.callbacks.has(data.id)) {
        const fn = this.callbacks.get(data.id)!;
        // remove it when execute.
        this.callbacks.delete(data.id);
        fn(data.data);
      }
    };
  }

  protected createEventId() {
    return `${Date.now()}_${++this.timer}`;
  }

  public emit<T, P = unknown>(data: P, callback: UserWorkerEventCallback<T>) {
    const id = this.createEventId();
    const msg: WorkerMessage<P> = {
      id,
      data,
    };

    this.callbacks.set(id, callback as UserWorkerEventCallback);
    sendMessageInClient(msg, this.worker);

    return { abort: () => this.callbacks.delete(id) };
  }

  public dispose() {
    this.worker.terminate();
  }
}
