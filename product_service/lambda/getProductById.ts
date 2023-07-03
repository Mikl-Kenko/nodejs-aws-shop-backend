import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { _response } from "../utils/response";


const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION });
const doc_client = DynamoDBDocumentClient.from(dynamo);
const getItem = async (tableName: string, key: string, value: string) => {
  const data = await doc_client.send(
    new GetCommand({ TableName: tableName, Key: { [key]: value } })
  );
  return data.Item;
};

export const handler = async (event: APIGatewayProxyEvent) => {
  console.log( JSON.stringify(event.pathParameters));

  const product_id = event.pathParameters?.productId;
  if (!product_id)
    return _response(400, { message: "ProductId is bad!" });

  try {
    const product = await getItem(process.env.PRODUCTS_TABLE!,"id", product_id);
    if (!product) {
      return _response(404, {message: "Product not found!",});
    }

    const stock = await getItem(process.env.STOCKS_TABLE!, "product_id", product_id);
    if (!stock) {
      return _response(404, {message: "Stock not found!",});
    }

    const response = _response(200, { ...product, count: stock.count });
    return response;
  } catch (error: any) {
    return _response(500, {message: error instanceof Error ? error.message : "Server error!",});
    }
};
