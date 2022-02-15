import { HelloWorldRequest, HelloWorldResponse } from "../../../gensrc/com/example/testservice";

type InternalJsonLambda<TResponse> = (event: object) => Promise<TResponse>;
type TestLambdaHandler = InternalJsonLambda<HelloWorldResponse>;

export const handler: TestLambdaHandler = async (event: object) => {
  const request = HelloWorldRequest.fromJSON(event);

  return {
    helloWorld: {
      greeting: request.helloWorld?.greeting || "Hello World!",
    },
  };
};
