import { APIGatewayProxyEvent } from "aws-lambda";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { _response } from "../utils/response";
import { _folders } from "../utils/const"


export const handler = async (event: APIGatewayProxyEvent) => {
  const file_name = event.queryStringParameters?.name;

  if (!file_name) {
    return _response(400, { message: "Missing name!", });
  }
  const s3 = new S3Client({ region: process.env.AWS_REGION });
  const bucket = process.env.BUCKET_NAME;
  const key = `${_folders.UPLOADED}/${file_name}`;
  const put = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  try {
    const url = await getSignedUrl(s3, put);
    return _response(200, url);
  } catch (error: any) {
    return _response(500, { message: error instanceof Error ? error.message : "Server error", });
    }
};
