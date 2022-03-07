import { RunSagaOptions, runSaga, stdChannel } from "redux-saga";

const channel = stdChannel();

const io: RunSagaOptions<unknown, number> = {
  // this will be used to orchestrate take and put Effects
  channel,
};

export function unsafeRunAsync<T>(saga: () => Iterator<unknown, T, unknown>): Promise<T> {
  return runSaga(io, saga).toPromise();
}
