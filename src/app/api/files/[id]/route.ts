import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getGridFSDownloadStream } from '@/lib/gridfs';
import { Equipment } from '@/lib/models/Equipment';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return new NextResponse('Invalid file ID', { status: 400 });
  }

  await connectDB();

  // Authorization check: If this file belongs to equipment, verify visibility
  const equipment = await Equipment.findOne({ fileId: new mongoose.Types.ObjectId(id) });

  if (equipment) {
    const isApproved = equipment.status === 'approved';
    const isOwner = equipment.submittedBy.toString() === session.userId;
    const isAdmin = session.role === 'admin';

    if (!isApproved && !isOwner && !isAdmin) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  const fileData = await getGridFSDownloadStream(id);

  if (!fileData) {
    return new NextResponse('File not found', { status: 404 });
  }

  // Convert Node.js readable stream to Web ReadableStream
  const webStream = new ReadableStream({
    start(controller) {
      fileData.stream.on('data', (chunk) => controller.enqueue(chunk));
      fileData.stream.on('end', () => controller.close());
      fileData.stream.on('error', (err) => controller.error(err));
    },
  });

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': fileData.contentType,
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
