import * as lambda from "aws-cdk-lib/aws-lambda";

export const response = (code: number, body: any) => ({
  statusCode: code,
  headers: {
    "Access-Control-Allow-Credentials": true,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*"
  },
  body: JSON.stringify(body)
});

export const shareLambdaProps = {
  runtime: lambda.Runtime.NODEJS_18_X,
  enviroment: {
    AWS_REGION: process.env.AWS_REGION
  }
};