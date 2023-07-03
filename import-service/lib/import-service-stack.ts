import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3notificaitions from "aws-cdk-lib/aws-s3-notifications";
import {NodejsFunction,NodejsFunctionProps,} from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apiGateway from "aws-cdk-lib/aws-apigateway";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { PolicyDocument, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import path = require("path");
import { _folders } from "../utils/const";
import * as dotenv from 'dotenv';  
dotenv.config();


enum Lambdas {
  importFileParser = "importFileParser",
  importProductsFile = "importProductsFile",
}

const sharedLambdaProps: Partial<NodejsFunctionProps> = {
  runtime: lambda.Runtime.NODEJS_18_X,
  environment: {
    S3_BUCKET_IMPORT_NAME : process.env.BUCKET_NAME|| '',
    S3_BUCKET_IMPORT_REGION : process.env.AWS_REGION|| '',
  },
  bundling: {
    externalModules: [
      "aws-lambda",
      "stream",
      "@aws-sdk/client-s3",
      "@aws-sdk/s3-request-presigner",
    ],
  },
};

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const import_queue_arn = cdk.Fn.importValue("ImportQueueArn");
    const import_queue = sqs.Queue.fromQueueArn(this,"ImportQueue",import_queue_arn);

    const authoriz_lambda_arn = cdk.Fn.importValue("AuthorizerLambdaArn");
    const authoriz_lambda = lambda.Function.fromFunctionArn(this,"AuthorizerLambda",authoriz_lambda_arn);

    const bucket = new s3.Bucket(this, "ImportBucket", {
      bucketName: process.env.BUCKET_NAME,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedOrigins: ["*"],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedHeaders: ["*"],
          exposedHeaders: [],
        },
      ],
    });

    const importProductsFile = new NodejsFunction(this,Lambdas.importProductsFile,
      {
        ...sharedLambdaProps,
        functionName: Lambdas.importProductsFile,
        entry: path.join(__dirname,"..","lambda",`${Lambdas.importProductsFile}.ts`),
      }
    );

    const importFileParser = new NodejsFunction(this,Lambdas.importFileParser,
      {
        ...sharedLambdaProps,
        environment: {
          ...sharedLambdaProps.environment,
          IMPORT_QUEUE_URL: import_queue.queueUrl,
        },
        functionName: Lambdas.importFileParser,
        entry: path.join(__dirname,"..","lambda",`${Lambdas.importFileParser}.ts`),
        bundling: {externalModules: ["aws-lambda"],},
      }
    );
    import_queue.grantSendMessages(importFileParser);

    const api = new apiGateway.RestApi(this, "ImportApiGateway", {
      restApiName: "Import API",
      defaultCorsPreflightOptions: {
        allowOrigins: apiGateway.Cors.ALL_ORIGINS,
        allowMethods: apiGateway.Cors.ALL_METHODS,
        allowHeaders: ["*"],
        allowCredentials: true,
      },
    });

    const auth_role = new Role(this, "authorizer-role", {
      roleName: "authorizer-role",
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
      inlinePolicies: {
        allowLambdaInvocation: PolicyDocument.fromJson({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: ["lambda:InvokeFunction", "lambda:InvokeAsync"],
              Resource: authoriz_lambda_arn,
            },
          ],
        }),
      },
    });

    const authorizer = new apiGateway.TokenAuthorizer(this,"ImportApiGatewayAuthorizer", {
        authorizerName: "ImportAuthorizer",
        handler: authoriz_lambda,
        resultsCacheTtl: cdk.Duration.seconds(0),
        assumeRole: auth_role,
      }
    );

    api.root
      .addResource("import")
      .addMethod("GET", new apiGateway.LambdaIntegration(importProductsFile), {
        requestParameters: { "method.request.querystring.name": true },
        authorizationType: apiGateway.AuthorizationType.CUSTOM,
        authorizer,
      });

    bucket.grantReadWrite(importProductsFile);
    bucket.grantReadWrite(importFileParser);
    bucket.grantDelete(importFileParser);
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3notificaitions.LambdaDestination(importFileParser),
      { prefix: _folders.UPLOADED }
    );
  }
}
