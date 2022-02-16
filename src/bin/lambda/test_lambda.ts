import * as _ from "lodash";
import {
  FloodSqsRequest,
  FloodSqsResponse,
  HelloWorldRequest,
  HelloWorldResponse,
} from "../../../gensrc/com/example/testservice";
import { Handler, SQSEvent, SQSHandler } from "aws-lambda";
import { SQS } from "@aws-sdk/client-sqs";

type InternalJsonLambda<TResponse> = (event: object) => Promise<TResponse>;
type TestLambdaHandler = InternalJsonLambda<HelloWorldResponse>;

let lazySqsClient: SQS | null = null;

export const handler: TestLambdaHandler = async (event: object) => {
  const request = HelloWorldRequest.fromJSON(event);

  return {
    helloWorld: {
      greeting: request.helloWorld?.greeting || "Hello World!",
    },
  };
};

async function delay(seconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000.0);
  });
}

export const sqsHandler: SQSHandler = async (event: SQSEvent) => {
  console.log(`Got a batch of ${event.Records.length} messages, delaying 30 sec`);
  await delay(30);
  console.log("Done waiting");
};

function generateStringOfLength(length: number): string {
  return new Array(length + 1).join("A");
}

export const sqsFloodHandler: Handler<object, FloodSqsResponse> = async (event: object) => {
  const request = FloodSqsRequest.fromJSON(event);
  const queueUrl = process.env["QUEUE_URL"];

  if (!queueUrl) {
    throw new Error("Must set QUEUE_URL");
  }

  lazySqsClient = lazySqsClient || new SQS({});

  const client = lazySqsClient;

  const messageBody = generateStringOfLength(request.messageSize);

  for (const messageIndexChunk of _.chunk(_.range(0, request.messageCount), 100)) {
    await Promise.all(
      messageIndexChunk.map((_) => {
        return client.sendMessage({
          MessageBody: messageBody,
          QueueUrl: queueUrl,
        });
      })
    );
  }

  console.log(`Published ${request.messageCount} messages of ${request.messageSize} bytes`);

  return FloodSqsResponse.fromPartial({});
};
