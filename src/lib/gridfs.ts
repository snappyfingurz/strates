import mongoose from 'mongoose';
import sharp from 'sharp';
import crypto from 'crypto';
import { Readable } from 'stream';
import { connectDB } from './db';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export type AllowedImageFormat = 'jpeg' | 'png' | 'webp';

/**
 * Validates image magic bytes to ensure file content matches allowed image formats,
 * preventing malicious file extensions or polyglot files.
 */
export function validateImageMagicBytes(buffer: Buffer): AllowedImageFormat | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // WebP: RIFF .... WEBP
  const riff = buffer.subarray(0, 4).toString('ascii');
  const webp = buffer.subarray(8, 12).toString('ascii');
  if (riff === 'RIFF' && webp === 'WEBP') {
    return 'webp';
  }

  return null;
}

/**
 * Sanitizes and re-encodes the image using sharp to strip all EXIF metadata.
 * Outputs a clean WebP buffer.
 */
export async function processAndSanitizeImage(
  buffer: Buffer
): Promise<{ sanitizedBuffer: Buffer; contentType: string }> {
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error('File exceeds maximum allowed size of 5 MB');
  }

  const format = validateImageMagicBytes(buffer);
  if (!format) {
    throw new Error('Invalid file format. Allowed formats: JPEG, PNG, WebP');
  }

  // Re-encode through sharp without metadata (strips GPS, device info, etc.)
  const sanitizedBuffer = await sharp(buffer)
    .rotate() // auto-orient based on EXIF before stripping
    .webp({ quality: 85 })
    .toBuffer();

  return {
    sanitizedBuffer,
    contentType: 'image/webp',
  };
}

/**
 * Uploads a sanitized buffer to MongoDB GridFS bucket.
 */
export async function uploadToGridFS(
  buffer: Buffer,
  metadata?: Record<string, unknown>
): Promise<mongoose.Types.ObjectId> {
  const conn = await connectDB();
  const db = conn.connection.db;

  if (!db) {
    throw new Error('Database connection not established');
  }

  const bucket = new mongoose.mongo.GridFSBucket(db, {
    bucketName: 'uploads',
  });

  const randomFilename = `${crypto.randomUUID()}.webp`;
  const readable = Readable.from(buffer);

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(randomFilename, {
      metadata: { ...(metadata || {}), contentType: 'image/webp' },
    });

    readable
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => {
        resolve(uploadStream.id as mongoose.Types.ObjectId);
      });
  });
}

/**
 * Opens a download stream for a GridFS file by ID.
 */
export async function getGridFSDownloadStream(
  fileId: string
): Promise<{ stream: NodeJS.ReadableStream; filename: string; contentType: string } | null> {
  const conn = await connectDB();
  const db = conn.connection.db;

  if (!db) {
    throw new Error('Database connection not established');
  }

  const bucket = new mongoose.mongo.GridFSBucket(db, {
    bucketName: 'uploads',
  });

  const objectId = new mongoose.Types.ObjectId(fileId);
  const files = await bucket.find({ _id: objectId }).toArray();

  if (!files || files.length === 0) {
    return null;
  }

  const file = files[0];
  const stream = bucket.openDownloadStream(objectId);

  return {
    stream,
    filename: file.filename,
    contentType: (file.metadata?.contentType as string) || 'image/webp',
  };
}
