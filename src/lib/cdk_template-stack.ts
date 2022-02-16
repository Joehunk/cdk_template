import * as lambdaApi from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";

export class CdkTemplateStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const lambdaIgnored = new NodejsFunction(this, "TestLambda", {
      entry: "src/bin/lambda/test_lambda.ts",
      handler: "handler",
      timeout: Duration.minutes(5),
      runtime: lambdaApi.Runtime.NODEJS_14_X,
      bundling: {
        sourceMap: true,
        minify: true,
      },
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
      },
    });

    const sqsLambda = new NodejsFunction(this, "TestSqsLambda", {
      entry: "src/bin/lambda/test_lambda.ts",
      handler: "sqsHandler",
      timeout: Duration.minutes(1),
      runtime: lambdaApi.Runtime.NODEJS_14_X,
      bundling: {
        sourceMap: true,
        minify: true,
      },
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
      },
      reservedConcurrentExecutions: 1,
    });

    const dlq = new Queue(this, "Test-Queue-DLQ", {
      queueName: "SQSParallelismTest-DLQ",
    });

    const sqs = new Queue(this, "Test-Queue", {
      queueName: "SQSParallelismTest",
      visibilityTimeout: Duration.minutes(3),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 2,
      },
    });

    const sqsEventSource = new SqsEventSource(sqs, {
      batchSize: 1024,
      maxBatchingWindow: Duration.seconds(10),
    });

    sqsLambda.addEventSource(sqsEventSource);

    const sqsFloodLambda = new NodejsFunction(this, "TestSqsFloodLambda", {
      entry: "src/bin/lambda/test_lambda.ts",
      handler: "sqsFloodHandler",
      timeout: Duration.minutes(10),
      runtime: lambdaApi.Runtime.NODEJS_14_X,
      bundling: {
        sourceMap: true,
        minify: true,
      },
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
        QUEUE_URL: sqs.queueUrl,
      },
    });

    sqsFloodLambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [sqs.queueArn],
        actions: ["sqs:SendMessage"],
      })
    );
  }
}
