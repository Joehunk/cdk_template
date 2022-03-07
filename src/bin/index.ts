import { CallEffect, Effect, call, delay } from "redux-saga/effects";
import { unsafeRunAsync } from "./middleware";

async function effectfulThing() {
  console.log("Hello world!");
  return 5;
}

function repeatDelayedEffect<T>(effect: Effect<T>, times: number): CallEffect<T | undefined> {
  function* doIt() {
    let result: T | undefined;

    for (let i = 0; i < times; ++i) {
      result = yield effect;
      yield delay(500);
    }

    return result;
  }

  return call(doIt);
}

function* repeatDelayedEffect2<T>(effect: Effect<T>, times: number) {
  let result: T | undefined;

  for (let i = 0; i < times; ++i) {
    result = yield effect;
    yield delay(500);
  }

  return result;
}

function* mainSaga() {
  const effect = call(effectfulThing);

  // Unclear which of these 2 is easier to test/maintain.
  // Need to experiment.
  yield repeatDelayedEffect(effect, 2);
  const foo = yield* repeatDelayedEffect2(effect, 5);

  yield call(async () => {
    console.log(`The saga returned: ${foo}`);
  });
}

async function main() {
  await unsafeRunAsync(mainSaga);
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main().then(() => process.exit(0));
}
