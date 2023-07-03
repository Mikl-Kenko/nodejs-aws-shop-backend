import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand,} from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { randomUUID } from "crypto";
import { schema } from "../utils/schema";
import { _response } from "../utils/response";


const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION });
const doc_client = DynamoDBDocumentClient.from(dynamo);

export const create_product = async (create: any) => {
  const product_stock = schema.parse(create);

  const { count, ...productData } = product_stock;
  const id = randomUUID();
  const product = { ...productData, id };
  const stock = { product_id: id, count };

  // try {
    await doc_client.send(new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: process.env.PRODUCTS_TABLE!,
              Item: product,
            },
          },
          {
            Put: {
              TableName: process.env.STOCKS_TABLE!,
              Item: stock,
            },
          },
        ],
    }));
    return { ...product_stock, id };
};

export const handler = async (event: APIGatewayProxyEvent) => {
  if (!event.body || !schema.safeParse(event.body).success)
    return _response(401, { message: "Invalid product!" });
  const create_prod = JSON.parse(event.body);
  console.log(JSON.stringify(create_prod));

  try {
    const response = create_product(create_prod);
    return _response(200, response);
  } catch (error: any) {
    return _response(500, { message: error instanceof Error ? error.message : "Server error!",});
    }
};
