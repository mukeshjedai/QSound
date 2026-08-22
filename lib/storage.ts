import { BlobSASPermissions, BlobServiceClient, ContainerClient, generateBlobSASQueryParameters, SASProtocol, StorageSharedKeyCredential } from "@azure/storage-blob";
import type { Book } from "./types";

const INDEX_BLOB = "data/books.json";

function container(): ContainerClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured");
  return BlobServiceClient.fromConnectionString(connectionString).getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER || "qsound"
  );
}

function service() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured");
  return BlobServiceClient.fromConnectionString(connectionString);
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

export async function createDirectUploadUrl(blobName: string, contentType: string) {
  const client = container();
  await client.createIfNotExists();
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || "";
  const values = Object.fromEntries(connectionString.split(";").filter(Boolean).map((part) => {
    const separator = part.indexOf("=");
    return [part.slice(0, separator), part.slice(separator + 1)];
  }));
  if (!values.AccountName || !values.AccountKey) throw new Error("Azure account credentials are unavailable");
  const credential = new StorageSharedKeyCredential(values.AccountName, values.AccountKey);
  const startsOn = new Date(Date.now() - 60_000);
  const expiresOn = new Date(Date.now() + 30 * 60_000);
  const sas = generateBlobSASQueryParameters({
    containerName: client.containerName,
    blobName,
    permissions: BlobSASPermissions.parse("cw"),
    protocol: SASProtocol.Https,
    startsOn,
    expiresOn,
    contentType
  }, credential).toString();
  return `${client.getBlockBlobClient(blobName).url}?${sas}`;
}

export async function audioBlobExists(blobName: string) {
  return container().getBlockBlobClient(blobName).exists();
}

export async function ensureUploadCors(origin: string) {
  const url = new URL(origin);
  if (url.origin !== origin || (url.protocol !== "https:" && url.hostname !== "localhost")) {
    throw new Error("The application origin is not valid for direct uploads");
  }
  const client = service();
  const properties = await client.getProperties();
  const cors = [...(properties.cors || [])];
  const uploadRule = cors.find((rule) =>
    rule.allowedMethods.split(",").includes("PUT") &&
    (rule.allowedHeaders.includes("*") || rule.allowedHeaders.toLowerCase().includes("x-ms-blob-type"))
  );
  if (uploadRule) {
    const origins = uploadRule.allowedOrigins.split(",").map((item) => item.trim());
    if (origins.includes(origin) || origins.includes("*")) return;
    uploadRule.allowedOrigins = [...origins, origin].join(",");
  } else {
    if (cors.length >= 5) throw new Error("Azure already has the maximum number of CORS rules; add this app origin manually");
    cors.push({
      allowedOrigins: origin,
      allowedMethods: "PUT,OPTIONS",
      allowedHeaders: "content-type,x-ms-blob-type",
      exposedHeaders: "etag,x-ms-request-id",
      maxAgeInSeconds: 3600
    });
  }
  await client.setProperties({ ...properties, cors });
}

async function streamToText(stream: NodeJS.ReadableStream | undefined): Promise<string> {
  if (!stream) return "[]";
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}
