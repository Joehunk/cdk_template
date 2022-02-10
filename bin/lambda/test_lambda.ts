interface Event {
  payload: string;
}

interface Response {
  payload: string;
}

type TestLambdaHandler = (event: Event) => Promise<Response>

export const handler: TestLambdaHandler = async (_event: Event) => {
  return {
    payload: "Hello world"
  };
};
