import { RunSagaOptions, stdChannel } from "redux-saga";

const channel = stdChannel();

export const io: RunSagaOptions<unknown, number> = {
  // this will be used to orchestrate take and put Effects
  channel,
};
