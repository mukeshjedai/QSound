import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import type { Book } from "./types";

const INDEX_BLOB = "data/books.json";

function container(): ContainerClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured");
  return BlobServiceClient.fromConnectionString(connectionString).getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER || "qsound"
  );
}

export async function getBooks(): Promise<Book[]> {
  const client = container();
  await client.createIfNotExists();
  const blob = client.getBlockBlobClient(INDEX_BLOB);
  if (!(await blob.exists())) return [];
  const response = await blob.download();
  const text = await streamToText(response.readableStreamBody);
  return JSON.parse(text) as Book[];
}

export async function saveBooks(books: Book[]) {
  const client = container();
  await client.createIfNotExists();
  const body = JSON.stringify(books, null, 2);
  await client.getBlockBlobClient(INDEX_BLOB).upload(body, Buffer.byteLength(body), {
    blobHTTPHeaders: { blobContentType: "application/json" }
  });
}

export async function uploadAudio(bookId: string, chapterId: string, file: File) {
  const client = container();
  await client.createIfNotExists();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const blobName = `audio/${bookId}/${chapterId}-${safeName}`;
  const blob = client.getBlockBlobClient(blobName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await blob.uploadData(bytes, {
    blobHTTPHeaders: { blobContentType: file.type || "audio/mpeg" }
  });
  return { blobName, audioUrl: `/api/audio/${blobName.split("/").map(encodeURIComponent).join("/")}` };
}

export async function getAudioBlob(blobName: string) {
  const client = container();
  return client.getBlockBlobClient(blobName);
}

export async function deleteAudio(blobName: string) {
  const client = container();
  await client.getBlockBlobClient(blobName).deleteIfExists();
}

async function streamToText(stream: NodeJS.ReadableStream | undefined): Promise<string> {
  if (!stream) return "[]";
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}
