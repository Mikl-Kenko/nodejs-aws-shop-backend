type Headers = Record<string, string | boolean>;

export interface Response {
  statusCode: number;
  body: string;
  headers: Headers;
}

export const _response = (
  statusCode: number,
  body: object = {}
): Response => {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Credentials": true,
    },
  };
};
