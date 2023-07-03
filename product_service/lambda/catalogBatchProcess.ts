import { SQSEvent } from "aws-lambda";
import { create_product } from "./createProduct"


export const handler = async (event: SQSEvent) => {
  const records = event.Records;
  for (const record of records) {
    console.log("body: ", record.body);
    const create = JSON.parse(record.body);
    await create_product(create);
  }
  console.log("Done!");
};
