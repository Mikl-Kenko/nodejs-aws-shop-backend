import { APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as stream from 'stream';
import csvParser from "csv-parser";

export async function importFileParser(event: any): Promise<APIGatewayProxyResult> {
  const s3 = new S3Client({ region: process.env.AWS_REGION });
  const BUCKET = process.env.BUCKET_NAME;

  try {
    for (const record of event.Records) {
      const res: any[] = [];
      const params = {
        Bucket: BUCKET,
        Key: record.s3.object.key,
      };
      const { Body } = await s3.send(new GetObjectCommand(params));

      await new Promise<void>((resolve, reject) => {
        const s3Stream = Body as stream.Readable;
        s3Stream
          .pipe(csvParser())
          .on('data', (data) => res.push(data))
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });

      console.log(`Data for ${record.s3.object.key}:`);
      console.log(res);

      await s3.send(
        new CopyObjectCommand({
          Bucket: BUCKET,
          CopySource: `${BUCKET}/${record.s3.object.key}`,
          Key: record.s3.object.key.replace('uploaded', 'parsed'),
        })
      );

      console.log(`${record.s3.object.key} copied`);

      await s3.send(new DeleteObjectCommand(params));

      console.log(`${record.s3.object.key} deleted`);
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'File was parsed' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
}