import { products } from "../mock/products";
import { response } from "../utils";

export const handler = async () => {
  try {
    return response(200, products );
  } catch (err: any) {
    return response(500, { message: err });
  }
};