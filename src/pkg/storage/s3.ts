import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "mock-key",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "mock-secret",
  },
  endpoint: process.env.AWS_ENDPOINT, // Optional for MinIO/DigitalOcean
  forcePathStyle: !!process.env.AWS_ENDPOINT, // Required for MinIO
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "teamtrack-uploads";

export const generateUploadUrl = async (objectKey: string, contentType: string): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
    ContentType: contentType,
  });
  // URL valid for 15 minutes
  return getSignedUrl(s3Client, command, { expiresIn: 900 });
};

export const generateDownloadUrl = async (objectKey: string, originalName: string): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(originalName)}"`,
  });
  // URL valid for 1 hour
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
};
