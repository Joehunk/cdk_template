import { CallEffect, call } from "redux-saga/effects";

async function* asyncGen(): AsyncGenerator<number, void, void> {
  yield 1;
  yield 2;
  yield 3;
}

async function asyncFunc() {
  return 1;
}

function iterateAsync<T, U>(gen: AsyncGenerator<T, U, void>): CallEffect<IteratorResult<T, U>> {
  return call(gen.next);
}

test("Async effect equality", () => {
  const call1 = call(asyncFunc);
  const call2 = call(asyncFunc);

  expect(call1).toMatchObject(call2);
});

test("Async generator equality", () => {
  const gen1 = asyncGen();
  const gen2 = asyncGen();

  expect(gen1).toMatchObject(gen2);
});

test("Async generator iterator equality", () => {
  const gen1 = asyncGen();
  const gen2 = asyncGen();

  const iter1 = iterateAsync(gen1);
  const iter2 = iterateAsync(gen2);

  expect(iter1).toMatchObject(iter2);
});
