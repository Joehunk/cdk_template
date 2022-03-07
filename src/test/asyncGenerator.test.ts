import { CallEffect, call } from "redux-saga/effects";
import { unsafeRunAsync } from "../bin/middleware";

async function* asyncGen(): AsyncGenerator<number, void, void> {
  yield 1;
  yield 2;
  yield 3;
}

async function asyncFunc() {
  return 1;
}

function doNext<T, U>(gen: AsyncGenerator<T, U, void>): Promise<IteratorResult<T, U>> {
  return gen.next();
}

function iterateAsync<T, U>(gen: AsyncGenerator<T, U, void>): CallEffect<IteratorResult<T, U>> {
  // The type inferencer wasn't quite amazing enough here.
  return call(doNext, gen) as CallEffect<IteratorResult<T, U>>;
}

async function doLog(value: string) {
  console.log(value);
}

function* asyncIteratorSaga() {
  const iterator = iterateAsync(asyncGen());
  let sum = 0;

  for (let i: IteratorResult<number, void> = yield iterator; !i.done; i = yield iterator) {
    yield call(doLog, `It is: ${i.value}`);
    sum += i.value;
  }

  return sum;
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

test("Async generator saga purely functional test", () => {
  const saga = asyncIteratorSaga();
  const iterator = iterateAsync(asyncGen());

  // Notice that the actual implementation of the async generator function is
  // irrelevant, since the whole thing is considered an effect. This makes me debate
  // the wisdom of using it since almost by definition an async generator is a thing
  // that mixes logic and effects, with no way to test the logic separately from the
  // effects, and if we're doing that then why the heck are we even using redux-saga?
  expect(saga.next().value).toMatchObject(iterator);
  expect(saga.next({ done: false, value: 1 }).value).toMatchObject(call(doLog, "It is: 1"));
});

test("Async generator saga effectful test", async () => {
  const result = await unsafeRunAsync(asyncIteratorSaga);

  expect(result).toEqual(6);
});
