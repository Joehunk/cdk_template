import * as lambdaApi from "aws-cdk-lib/aws-lambda";
import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
export class CdkTemplateStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const lambdaIgnored = new NodejsFunction(this, "TestLambda", {
      entry: "bin/lambda/test_lambda.ts",
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
  }
}
