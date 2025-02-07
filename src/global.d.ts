// global.d.ts
interface AsyncIterableIterator<T> extends AsyncIterable<T> {
  next(...args: [] | [undefined]): Promise<IteratorResult<T>>;
  return?(value?: T | PromiseLike<T>): Promise<IteratorResult<T>>;
  throw?(e?: any): Promise<IteratorResult<T>>;
}
