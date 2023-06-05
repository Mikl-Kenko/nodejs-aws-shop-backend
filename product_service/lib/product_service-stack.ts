import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as api_gate from "@aws-cdk/aws-apigatewayv2-alpha";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";
import { shareLambdaProps } from "../utils";

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsList = new NodejsFunction(this, "GetProductsLambda", {
      ...shareLambdaProps,
      functionName: "getProductsList",
      entry: path.join(__dirname, "..", "handlers", "getProductsList.ts")
    });

    const getProductsById = new NodejsFunction(this, "GetProductsByIdLambda", {
      ...shareLambdaProps,
      functionName: "getProductsById",
      entry: path.join(__dirname, "..", "handlers", "getProductsById.ts")
    });

    const httpApi = new api_gate.HttpApi(this, "ProductApi", {
      corsPreflight: {
        allowHeaders: ["*"],
        allowOrigins: ["*"],
        allowMethods: [api_gate.CorsHttpMethod.GET]
      }
    });

    httpApi.addRoutes({
      path: "/products",
      methods: [api_gate.HttpMethod.GET],
      integration: new HttpLambdaIntegration("Get products", getProductsList)
    });

    httpApi.addRoutes({
      path: "/products/{productId}",
      methods: [api_gate.HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        "Get products by id",
        getProductsById
      )
    });
  }
}