import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3notificaitions from "aws-cdk-lib/aws-s3-notifications";
import {NodejsFunction,NodejsFunctionProps,} from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apiGateway from "aws-cdk-lib/aws-apigateway";
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

    const [importProductsFile, importFileParser] = [
      Lambdas.importProductsFile,
      Lambdas.importFileParser,
    ].map(
      (lambda_name) =>
        new NodejsFunction(this, lambda_name, {
          ...sharedLambdaProps,
          functionName: lambda_name,
          entry: path.join(__dirname, "..", "lambda", `${lambda_name}.ts`),
        })
    );

    const api = new apiGateway.RestApi(this, "ImportApiGateway", {
      restApiName: "Import API",
      defaultCorsPreflightOptions: {
        allowOrigins: apiGateway.Cors.ALL_ORIGINS,
        allowMethods: apiGateway.Cors.ALL_METHODS,
        allowHeaders: ["*"],
        allowCredentials: true,
      },
    });

    api.root
      .addResource("import")
      .addMethod("GET", new apiGateway.LambdaIntegration(importProductsFile), {
        requestParameters: { "method.request.querystring.name": true },
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
