import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function importProductsFile(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const fileName = event.queryStringParameters?.name;
    console.log('importProductsFile input: ',JSON.stringify(event));
    if (!fileName) {
      return {
        statusCode: 400,
        body: JSON.stringify({errorMessage:'Provide a file name.'}),
      };
    }
    const s3 = new S3Client({ region: process.env.AWS_REGION });
    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: `uploaded/${fileName}`,
      Expires: 60,
      ContentType: 'text/csv',
    };
    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3, command);
    return {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type':'text/csv'
      },
      statusCode: 200,
      body: JSON.stringify(url),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Server Error!' })
    };
  }
}