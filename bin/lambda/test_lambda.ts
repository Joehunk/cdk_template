interface Event {
  payload: string;
}

interface Response {
  payload: string;
}

type TestLambdaHandler = (event: Event) => Promise<Response>;

export const handler: TestLambdaHandler = async (event: Event) => {
  if (event.payload === "crash") {
    throw new Error("I am crashing.");
  }

  return {
    payload: "Hello world!!!",
  };
};
