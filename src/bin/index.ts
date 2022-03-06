import { call } from "redux-saga/effects";
import { io } from "./middleware";
import { runSaga } from "redux-saga";

async function effectfulThing() {
  console.log("Hello world");
}

async function main() {
  await runSaga(io, function* saga() {
    yield call(effectfulThing);
  }).toPromise();
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main().then(() => process.exit(0));
}
