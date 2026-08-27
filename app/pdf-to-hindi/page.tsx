"use client";

import { useState } from "react";
import { ArrowLeft, BookOpen, Check, Download, FileText, Headphones, Link2, Loader2, Upload, X } from "lucide-react";
import "./pdf-to-hindi.css";

type HindiBook = { id: string; title: string; content: string };

export default function PdfToHindiPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [books, setBooks] = useState<HindiBook[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  function selectFile(selected: File | null) {
    if (selected && selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }
    setError(""); setFile(selected);
    if (selected) setPdfUrl("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file && !pdfUrl.trim()) return setError("Choose a PDF or enter its public URL.");
    setLoading(true); setError(""); setBooks([]); setActive(0);
    const form = new FormData();
    if (file) form.set("file", file); else form.set("pdfUrl", pdfUrl.trim());
    try {
      const response = await fetch("/api/pdf-to-hindi", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "The books could not be created.");
      setBooks(data.books);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The books could not be created.");
    } finally { setLoading(false); }
  }

  function download(book: HindiBook) {
    const url = URL.createObjectURL(new Blob([book.content], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `${book.id}-hindi-book.md`; anchor.click();
    URL.revokeObjectURL(url);
  }

  return <main className="hindi-page">
    <nav className="hindi-nav"><a className="brand" href="/"><span className="brand-mark"><Headphones size={21}/></span><span>Q<span>Sound</span></span></a><a className="back-library" href="/"><ArrowLeft size={17}/> Library</a></nav>
    <header className="hindi-header"><div><span className="kicker">AI READING STUDIO</span><h1>PDF से तीन हिंदी पुस्तकें</h1><p>एक स्रोत से अवधारणाओं, अंशों और पारिभाषिक शब्दों की तीन अलग, व्यवस्थित व्याख्याएँ तैयार करें।</p></div><div className="book-stack" aria-hidden="true"><i/><i/><i/><BookOpen/></div></header>
    <section className="hindi-workspace">
      <form className="source-panel" onSubmit={submit}>
        <div className="panel-heading"><span>01</span><div><h2>अपना PDF चुनें</h2><p>फ़ाइल अपलोड करें या सार्वजनिक लिंक दें</p></div></div>
        <label className={`pdf-drop ${file ? "has-pdf" : ""} ${dragging ? "dragging" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); selectFile(e.dataTransfer.files[0] || null); }}>
          <input type="file" accept="application/pdf,.pdf" onChange={(e) => selectFile(e.target.files?.[0] || null)}/>
          {file ? <><Check/><b>{file.name}</b><small>{(file.size / 1024 / 1024).toFixed(1)} MB</small><button type="button" title="Remove PDF" onClick={(e) => { e.preventDefault(); selectFile(null); }}><X size={16}/></button></> : <><Upload/><b>PDF यहाँ छोड़ें</b><small>या फ़ाइल चुनने के लिए क्लिक करें · अधिकतम 20 MB</small></>}
        </label>
        <div className="source-divider"><span>या</span></div>
        <label className="url-field"><span><Link2 size={16}/> PDF URL</span><input type="url" value={pdfUrl} disabled={!!file} onChange={(e) => setPdfUrl(e.target.value)} placeholder="https://example.com/book.pdf"/></label>
        {error && <p className="generation-error">{error}</p>}
        <button className="primary generate" disabled={loading || (!file && !pdfUrl.trim())}>{loading ? <Loader2 className="spin"/> : <FileText/>}{loading ? "तीनों पुस्तकें बन रही हैं…" : "तीन हिंदी पुस्तकें बनाएँ"}</button>
        {loading && <p className="wait-note">लंबे PDF को पढ़ने और व्यवस्थित करने में कुछ मिनट लग सकते हैं। यह पेज खुला रखें।</p>}
      </form>
      <div className={`result-panel ${books.length ? "ready" : ""}`}>
        {!books.length ? <div className="result-empty"><div><BookOpen/></div><h2>आपकी पुस्तकें यहाँ दिखेंगी</h2><p>हर पुस्तक का अपना केंद्र होगा: अवधारणाएँ, अंश, और शब्दावली।</p><ol><li><b>अवधारणाएँ</b><span>विचारों और उनके संबंधों की सहज व्याख्या</span></li><li><b>अंश</b><span>महत्वपूर्ण खंडों का क्रमवार अर्थ</span></li><li><b>शब्दावली</b><span>मुख्य पदों का संदर्भ सहित कोश</span></li></ol></div> : <><div className="book-tabs" role="tablist">{books.map((book, index) => <button type="button" key={book.id} className={active === index ? "active" : ""} onClick={() => setActive(index)}><span>0{index + 1}</span>{book.title}</button>)}</div><article className="manuscript" lang="hi"><div className="manuscript-top"><span>हिंदी संस्करण</span><button onClick={() => download(books[active])}><Download size={17}/> डाउनलोड</button></div><pre>{books[active].content}</pre></article></>}
      </div>
    </section>
  </main>;
}
