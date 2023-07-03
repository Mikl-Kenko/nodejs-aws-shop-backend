import {CopyObjectCommand,DeleteObjectCommand,GetObjectCommand,S3Client,} from "@aws-sdk/client-s3";
import { PassThrough, Readable } from "stream";
import { S3Event } from "aws-lambda";
import csv from "csv-parser";
import { _response } from "../utils/response";
import { _folders } from "../utils/const"


export const handler = async (event: S3Event) => {
  try {
    const records = event.Records;
    if (!records.length) throw new Error("No records!");

    const file_name = records[0].s3.object.key;
    const s3 = new S3Client({ region: process.env.AWS_REGION });
    const bucket = process.env.BUCKET_NAME;
    const file = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: file_name }));

    const body = file.Body;
    if (!(body instanceof Readable)) { throw new Error("Failed to read!"); }

    await new Promise((res) => {
      body
        .pipe(new PassThrough())
        .pipe(csv())
        .on("data", console.log)
        .on("end", async () => {
          console.log("Finished reading");

          await s3.send(
            new CopyObjectCommand({
              Bucket: bucket,
              CopySource: `${bucket}/${file_name}`,
              Key: file_name.replace(_folders.UPLOADED, _folders.PARSED),
            })
          );
          console.log("Copi to /parsed!");
          await s3.send( new DeleteObjectCommand({ Bucket: bucket, Key: file_name }));
          console.log("Deleted file!");
          res(null);
        });
    });

    return _response(200, "Done!");
  } catch (error: any) {
    console.error(error);
    return _response(500, { message: error instanceof Error ? error.message : "Server error!", });
    }
};
