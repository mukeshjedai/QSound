import { NextResponse } from "next/server";
import { getBooks, saveBooks } from "@/lib/storage";
import type { Book } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getBooks());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load books" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    const author = String(body.author || "Unknown author").trim();
    const totalChapters = Number(body.totalChapters);
    if (!title || !Number.isInteger(totalChapters) || totalChapters < 1) {
      return NextResponse.json({ error: "A title and valid chapter count are required." }, { status: 400 });
    }
    const books = await getBooks();
    const accents = ["#e9693c", "#d9a441", "#8f6ccf", "#4f9488", "#b95364"];
    const book: Book = {
      id: crypto.randomUUID(), title, author, totalChapters, chapters: [],
      createdAt: new Date().toISOString(), accent: accents[books.length % accents.length]
    };
    books.unshift(book);
    await saveBooks(books);
    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create book" }, { status: 500 });
  }
}
