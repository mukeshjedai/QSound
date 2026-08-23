import { NextResponse } from "next/server";
import { getBooks, saveBooks } from "@/lib/storage";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ bookId: string }> }) {
  try {
    const { bookId } = await context.params;
    const body = await request.json();
    const books = await getBooks();
    const book = books.find((item) => item.id === bookId);
    if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });

    if (body.title !== undefined) {
      const title = String(body.title || "").trim();
      if (!title || title.length > 120) {
        return NextResponse.json({ error: "Enter a book title between 1 and 120 characters." }, { status: 400 });
      }
      book.title = title;
    } else if (body.totalChapters !== undefined) {
      const totalChapters = Number(body.totalChapters);
      if (!Number.isInteger(totalChapters) || totalChapters <= book.totalChapters || totalChapters > 500) {
        return NextResponse.json({ error: `Enter a chapter total between ${book.totalChapters + 1} and 500.` }, { status: 400 });
      }
      book.totalChapters = totalChapters;
    } else {
      return NextResponse.json({ error: "No supported book changes were provided." }, { status: 400 });
    }
    await saveBooks(books);
    return NextResponse.json(book);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update the book" }, { status: 500 });
  }
}
