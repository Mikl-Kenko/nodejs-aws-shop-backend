import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apiGateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import {NodejsFunction, NodejsFunctionProps,} from "aws-cdk-lib/aws-lambda-nodejs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Construct } from "constructs";
import * as path from "path";
import * as dotenv from "dotenv";  
dotenv.config();


const sharedTableProps: Partial<dynamodb.TableProps> = {
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  tableClass: dynamodb.TableClass.STANDARD,
};

enum Lambdas {
  getProductsList = "getProductsList",
  getProductById = "getProductById",
  createProduct = "createProduct",
  catalogBatchProcess = "catalogBatchProcess",
}

const sharedLambdaProps: Partial<NodejsFunctionProps> = {
  runtime: lambda.Runtime.NODEJS_18_X,
  environment: {
    PRODUCTS_AWS_REGION: process.env.AWS_REGION|| '',
    DYNAMODB_PRODUCTS_TABLE : process.env.PRODUCTS_TABLE|| '',
    DYNAMODB_STOCKS_TABLE : process.env.STOCKS_TABLE|| ''
  },
  bundling: { externalModules: ["aws-sdk", "crypto", "aws-lambda"] },
};

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const products_table = new dynamodb.Table(this, "products", {
      ...sharedTableProps,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      tableName: process.env.PRODUCTS_TABLE,
    });

    const stocks_table = new dynamodb.Table(this, "stocks", {
      ...sharedTableProps,
      partitionKey: { name: "product_id", type: dynamodb.AttributeType.STRING },
      tableName: process.env.STOCKS_TABLE,
    });

    const lambdaRole = new iam.Role(this, "LambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      inlinePolicies: {
        dynamoDBAccessPolicy: new iam.PolicyDocument({
          statements: [new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                "dynamodb:Scan",
                "dynamodb:GetItem",
                "dynamodb:PutItem",
              ],
              resources: [products_table.tableArn, stocks_table.tableArn],
            }),
          ],
        }),
      },
    });

    lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));
    const [
      getProductsList,
      getProductById,
      createProduct,
      catalogBatchProcess,
    ] = [   
      Lambdas.getProductsList,
      Lambdas.getProductById,
      Lambdas.createProduct,
      Lambdas.catalogBatchProcess,
    ].map(
      (lambdaName) =>
      new NodejsFunction(this, lambdaName, {
        ...sharedLambdaProps,
          functionName: lambdaName,
          entry: path.join(__dirname, "..", "lambda", `${lambdaName}.ts`),
          role: lambdaRole,
        })
    );

    const api = new apiGateway.RestApi(this, "ProductsApiGateway", {
      restApiName: "Products API",
      defaultCorsPreflightOptions: {
        allowOrigins: apiGateway.Cors.ALL_ORIGINS,
        allowMethods: apiGateway.Cors.ALL_METHODS,
        allowHeaders: ["*"],
        allowCredentials: true,
      },
    });

    const products = api.root.addResource("products");
    products.addMethod("GET", new apiGateway.LambdaIntegration(getProductsList));
    products.addMethod("POST", new apiGateway.LambdaIntegration(createProduct));
    products.addResource("{productId}").addMethod("GET", new apiGateway.LambdaIntegration(getProductById));
    
    const import_queue = new sqs.Queue(this, "ImportQueue", {
      queueName: "import-queue",
    });

    const batch_event = new SqsEventSource(import_queue,{batchSize: 5,});
    catalogBatchProcess.addEventSource(batch_event);

    new cdk.CfnOutput(this, "ImportQueueArnOutput", {
      value: import_queue.queueArn,
      exportName: "ImportQueueArn",
    });
  }
}
