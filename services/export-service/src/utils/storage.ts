// services/export-service/src/utils/storage.ts

import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config';

// Ensure uploads directory exists
fs.mkdirSync(config.uploadDir, { recursive: true });

// Initialize S3 client if AWS credentials are provided
const s3Client = config.awsAccessKey && config.awsSecretKey
  ? new S3Client({
      region: config.awsRegion,
      credentials: {
        accessKeyId: config.awsAccessKey,
        secretAccessKey: config.awsSecretKey,
      },
    })
  : null;

// Save file to local storage
export async function saveFileLocally(
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  const filePath = path.join(config.uploadDir, fileName);
  
  await fs.promises.writeFile(filePath, fileBuffer);
  
  return filePath;
}

// Upload file to S3
export async function uploadToS3(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  if (!s3Client) {
    throw new Error('S3 client not configured');
  }
  
  const key = `exports/${fileName}`;
  
  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );
  
  return `https://${config.s3Bucket}.s3.${config.awsRegion}.amazonaws.com/${key}`;
}

// Delete file from S3
export async function deleteFromS3(key: string): Promise<void> {
  if (!s3Client) {
    throw new Error('S3 client not configured');
  }
  
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: config.s3Bucket,
      Key: key,
    })
  );
}

// Get file URL - either S3 or local
export function getFileUrl(fileName: string): string {
  if (s3Client) {
    return `https://${config.s3Bucket}.s3.${config.awsRegion}.amazonaws.com/exports/${fileName}`;
  } else {
    return `${config.publicUrlBase}/${fileName}`;
  }
}

// Save exported file
export async function saveExportedFile(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  try {
    if (s3Client) {
      return await uploadToS3(fileBuffer, fileName, contentType);
    } else {
      await saveFileLocally(fileBuffer, fileName);
      return getFileUrl(fileName);
    }
  } catch (error) {
    console.error('Error saving exported file:', error);
    throw error;
  }
}

// Get content type for format
export function getContentTypeForFormat(format: string): string {
  switch (format.toUpperCase()) {
    case 'PDF':
      return 'application/pdf';
    case 'EXCEL':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'CSV':
      return 'text/csv';
    case 'JSON':
      return 'application/json';
    case 'HTML':
      return 'text/html';
    default:
      return 'application/octet-stream';
  }
}