export type CreateWorker = () => Worker;

export type NativeWorkerMessage<T = unknown> = MessageEvent<WorkerMessage<T>>;

export type WorkerMessage<T = unknown> = {
  id: number | string;
  data: T;
};

export type InternalWorkerEventCallback<T> = (message: WorkerMessage<T>) => unknown;

export type UserWorkerEventCallback<T = unknown> = (data: T) => unknown;

export type UserWorkerEventHandler<T = unknown, R = unknown> = (data: T) => R | Promise<R>;
