import { readFile } from "fs/promises";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import * as path from "path";
import * as dotenv from "dotenv";  
dotenv.config();
import { Product } from "../type";


const randomInRange = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const seed = async () => {
  const data = path.resolve(__dirname, "..", "data");
  const products = (await readFile(
    path.resolve(data, "products.json"),
    "utf8"
  ).then(JSON.parse)) as Product[];

  const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION });

  products.forEach((p) => {
    const product_batch = new PutItemCommand({
      TableName: process.env.PRODUCTS_TABLE,
      Item: {
        id: { S: p.id },
        title: { S: p.title },
        autor: { S: p.autor },
        price: { N: p.price.toString() },
      },
    });
    dynamo.send(product_batch);

    const stock_batch = new PutItemCommand({
      TableName: process.env.STOCKS_TABLE,
      Item: {
        product_id: { S: p.id },
        count: { N: randomInRange(1, 10).toString() },
      },
    });
    dynamo.send(stock_batch);
  });
};

seed();
