import * as cdk from 'aws-cdk-lib';
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import path = require("path");
import * as dotenv from 'dotenv'; 
dotenv.config();


const AUTHORIZER_LAMBDA = "basicAuthorizer";

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const authorizerLambda = new NodejsFunction(this, AUTHORIZER_LAMBDA, {
      functionName: AUTHORIZER_LAMBDA,
      entry: path.join(__dirname, "..", "lambda", `${AUTHORIZER_LAMBDA}.ts`),
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        AUTH_USER: process.env.AUTH_USER!,
        AUTH_PASSWORD: process.env.AUTH_PASSWORD!,
      },
    });
    new cdk.CfnOutput(this, "ImportQueueArnOutput", {
      value: authorizerLambda.functionArn,
      exportName: "AuthorizerLambdaArn",
    });
  }
}
