import { NextResponse } from "next/server";
import { getAudioBlob } from "@/lib/storage";
import { Readable } from "node:stream";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ blob: string[] }> }) {
  try {
    const { blob } = await context.params;
    const client = await getAudioBlob(blob.join("/"));
    const properties = await client.getProperties();
    const size = properties.contentLength || 0;
    const range = request.headers.get("range");
    let start = 0;
    let end = size ? size - 1 : 0;

    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (match) {
        start = Number(match[1]);
        if (match[2]) end = Math.min(Number(match[2]), end);
      }
    }

    const length = end - start + 1;
    const download = await client.download(start, length);
    const headers = new Headers({
      "Accept-Ranges": "bytes",
      "Content-Type": properties.contentType || "audio/mpeg",
      "Content-Length": String(length),
      "Cache-Control": "private, max-age=3600"
    });
    if (range) headers.set("Content-Range", `bytes ${start}-${end}/${size}`);

    if (!download.readableStreamBody) throw new Error("Audio stream is unavailable");
    const webStream = Readable.toWeb(download.readableStreamBody as Readable);
    return new NextResponse(webStream as ReadableStream, {
      status: range ? 206 : 200,
      headers
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Audio not found" }, { status: 404 });
  }
}
