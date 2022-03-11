import { HelloWorld, HelloWorldRequest, HelloWorldResponse } from "../../../gensrc/com/example/testservice";

type Json = number | string | null | boolean | { [key: string]: Json } | Array<Json>;
type InternalJsonLambda<TResponse> = (event: Json) => Promise<TResponse>;
type TestLambdaHandler = InternalJsonLambda<HelloWorldResponse>;

export const handler: TestLambdaHandler = async (event: Json) => {
  const request = HelloWorldRequest.fromJson(event);

  return {
    helloWorld: HelloWorld.create({
      greeting: request.helloWorld?.greeting || "Hello World!",
    }),
  };
};
