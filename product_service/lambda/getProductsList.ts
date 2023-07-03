import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { _response } from "../utils/response";


const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION });
const doc_client = DynamoDBDocumentClient.from(dynamo);

const scan = async (tableName: string) => {
  const data = await doc_client.send(new ScanCommand({ TableName: tableName }));
  return data.Items;
};

export const handler = async () => {
  try {
    const products = await scan(process.env.PRODUCTS_TABLE!);
    const stocks = await scan(process.env.STOCKS_TABLE!);
    if (!stocks) throw new Error("No stocks!");
    const stocks_map = new Map(stocks.map((item) => [item.product_id, item.count]));
    if (!products) throw new Error("No products!");

    const products_stocks = products.map((product) => ({
      ...product,
      count: stocks_map.get(product.id),
    }));

    return _response(200, products_stocks);
  } catch (error: any) {
    return _response(500, {message: error instanceof Error ? error.message : "Server error",});
    }
};
