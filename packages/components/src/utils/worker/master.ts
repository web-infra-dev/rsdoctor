import { CreateWorker } from './types';
import { ChildWorker } from './worker';

class Master {
  private _workerMap = new WeakMap<CreateWorker, ChildWorker>();

  public detectWorker(create: CreateWorker) {
    if (this._workerMap.has(create)) return this._workerMap.get(create)!;

    const worker = create();
    const child = new ChildWorker(worker);
    this._workerMap.set(create, child);

    return child;
  }
}

export const master = new Master();
