"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, Headphones, Library, ListMusic, Loader2, Pause, Play, Plus, Repeat2, Search, Trash2, Upload, Volume2, X } from "lucide-react";
import type { Book, Chapter } from "@/lib/types";

type Playing = { book: Book; index: number } | null;

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Book | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [playing, setPlaying] = useState<Playing>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const refresh = async () => {
    const response = await fetch("/api/books");
    const data = await response.json();
    if (response.ok) setBooks(data);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (selected) setSelected(books.find((b) => b.id === selected.id) || null);
  }, [books, selected?.id]);

  const chapter = playing?.book.chapters[playing.index];
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !chapter) return;
    audio.src = chapter.audioUrl;
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [chapter?.id]);

  function playChapter(book: Book, index: number) {
    if (playing?.book.id === book.id && playing.index === index) {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) audio.play(); else audio.pause();
      return;
    }
    setPlaying({ book, index });
  }

  function next() {
    if (!playing) return;
    const nextIndex = playing.index + 1;
    if (nextIndex < playing.book.chapters.length) setPlaying({ ...playing, index: nextIndex });
    else { setIsPlaying(false); setProgress(0); }
  }

  const filtered = books.filter((b) => `${b.title} ${b.author}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className={playing ? "has-player" : ""}>
      <nav>
        <button className="brand" onClick={() => setSelected(null)}><span className="brand-mark"><Headphones size={21}/></span><span>Q<span>Sound</span></span></button>
        <div className="search"><Search size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your library" /></div>
        <button className="avatar" aria-label="Profile">MK</button>
      </nav>

      {!selected ? (
        <>
          <header className="hero">
            <div className="eyebrow"><span/> YOUR STORIES, YOUR WAY</div>
            <h1>A library that<br/><em>sounds like you.</em></h1>
            <p>Bring your books to life, one chapter at a time. Upload, organise, and listen without interruption.</p>
            <button className="primary" onClick={() => setCreateOpen(true)}><Plus size={19}/> Create a book</button>
            <div className="soundwave" aria-hidden="true">{Array.from({length: 42}).map((_, i) => <i key={i} style={{height: `${12 + ((i * 17) % 54)}px`}}/>)}</div>
          </header>
          <section className="library-section">
            <div className="section-head"><div><span className="kicker">YOUR COLLECTION</span><h2>My Library</h2></div><span className="book-count">{books.length} {books.length === 1 ? "book" : "books"}</span></div>
            {loading ? <div className="empty"><Loader2 className="spin"/><p>Opening your library…</p></div> : filtered.length === 0 ? (
              <div className="empty"><div className="empty-icon"><Library/></div><h3>{books.length ? "No matching books" : "Your shelf is waiting"}</h3><p>{books.length ? "Try a different search." : "Create your first book and start adding chapters."}</p></div>
            ) : (
              <div className="book-grid">{filtered.map((book, index) => <BookCard book={book} index={index} key={book.id} onOpen={() => setSelected(book)} onPlay={() => book.chapters.length && playChapter(book, 0)}/>)}</div>
            )}
          </section>
        </>
      ) : (
        <BookDetail book={selected} onBack={() => setSelected(null)} onUpload={() => setUploadOpen(true)} onPlay={playChapter} onDelete={async (chapter) => {
          if (!window.confirm(`Delete “${chapter.title}” and its audio file? This cannot be undone.`)) return;
          const response = await fetch(`/api/books/${selected.id}/chapters/${chapter.id}`, { method: "DELETE" });
          const data = await response.json();
          if (!response.ok) return window.alert(data.error || "Unable to delete chapter.");
          if (playing?.book.id === selected.id && playing.book.chapters[playing.index]?.id === chapter.id) {
            audioRef.current?.pause();
            setPlaying(null);
            setIsPlaying(false);
          }
          await refresh();
        }} playing={playing} isPlaying={isPlaying}/>
      )}

      {createOpen && <CreateBook onClose={() => setCreateOpen(false)} onCreated={(book) => { setBooks((b) => [book, ...b]); setCreateOpen(false); setSelected(book); }}/>} 
      {uploadOpen && selected && <UploadChapter book={selected} onClose={() => setUploadOpen(false)} onUploaded={async () => { await refresh(); setUploadOpen(false); }}/>} 

      <audio ref={audioRef} loop={loop} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} onEnded={() => { if (!loop) next(); }}/>
      {playing && chapter && <Player book={playing.book} chapter={chapter} index={playing.index} isPlaying={isPlaying} loop={loop} progress={progress} duration={duration} onToggle={() => playChapter(playing.book, playing.index)} onLoop={() => setLoop(!loop)} onNext={next} onPrev={() => playing.index > 0 && setPlaying({...playing, index: playing.index - 1})} onSeek={(v) => { if (audioRef.current) audioRef.current.currentTime = v; }}/>} 
    </main>
  );
}

function BookCard({ book, index, onOpen, onPlay }: { book: Book; index: number; onOpen: () => void; onPlay: () => void }) {
  return <article className="book-card" onClick={onOpen}>
    <div className="cover" style={{"--accent": book.accent} as React.CSSProperties}><span className="cover-num">0{index + 1}</span><BookOpen size={36}/><div><strong>{book.title}</strong><small>{book.author}</small></div><span className="spine"/></div>
    <div className="book-info"><div><h3>{book.title}</h3><p>{book.author}</p><span>{book.chapters.length} of {book.totalChapters} chapters</span></div><button className="round-play" disabled={!book.chapters.length} onClick={(e) => { e.stopPropagation(); onPlay(); }}><Play size={18} fill="currentColor"/></button></div>
  </article>;
}

function BookDetail({ book, onBack, onUpload, onPlay, onDelete, playing, isPlaying }: { book: Book; onBack: () => void; onUpload: () => void; onPlay: (b: Book, i: number) => void; onDelete: (chapter: Chapter) => void; playing: Playing; isPlaying: boolean }) {
  return <section className="detail">
    <button className="back" onClick={onBack}><ChevronLeft/> Back to library</button>
    <div className="detail-hero">
      <div className="large-cover" style={{"--accent": book.accent} as React.CSSProperties}><BookOpen size={52}/><strong>{book.title}</strong><small>{book.author}</small></div>
      <div className="detail-copy"><span className="kicker">AUDIOBOOK</span><h1>{book.title}</h1><p>by {book.author}</p><div className="stats"><span><b>{book.chapters.length}</b> uploaded</span><i/><span><b>{book.totalChapters}</b> chapters</span></div>
        <div className="detail-actions"><button className="primary" disabled={!book.chapters.length} onClick={() => onPlay(book, 0)}><Play size={18} fill="currentColor"/> Play from start</button><button className="secondary" disabled={book.chapters.length >= book.totalChapters} onClick={onUpload}><Upload size={18}/> Add chapter</button></div>
      </div>
    </div>
    <div className="chapters-head"><div><span className="kicker">CONTENTS</span><h2>Chapters</h2></div><span>{book.chapters.length}/{book.totalChapters} complete</span></div>
    <div className="progress-line"><i style={{width: `${(book.chapters.length / book.totalChapters) * 100}%`}}/></div>
    <div className="chapter-list">{book.chapters.length ? book.chapters.map((ch, i) => { const active = playing?.book.id === book.id && playing.index === i; return <div key={ch.id} className={`chapter-row ${active ? "active" : ""}`} onClick={() => onPlay(book, i)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onPlay(book, i); }}><span className="chapter-number">{active && isPlaying ? <Pause size={16} fill="currentColor"/> : <>{String(i + 1).padStart(2, "0")}</>}</span><span><b>{ch.title}</b><small>Chapter {i + 1}</small></span><button className="delete-chapter" title={`Delete ${ch.title}`} aria-label={`Delete ${ch.title}`} onClick={(e) => { e.stopPropagation(); onDelete(ch); }}><Trash2 size={17}/></button><span className="row-play">{active && isPlaying ? <Pause/> : <Play fill="currentColor"/>}</span></div>; }) : <div className="empty compact"><ListMusic/><h3>No chapters yet</h3><p>Upload the first chapter to start listening.</p><button className="secondary" onClick={onUpload}><Upload size={17}/> Upload chapter</button></div>}</div>
  </section>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" onClick={onClose}><X/></button><span className="kicker">QSOUND LIBRARY</span><h2>{title}</h2><p>{subtitle}</p>{children}</div></div>;
}

function CreateBook({ onClose, onCreated }: { onClose: () => void; onCreated: (b: Book) => void }) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); setSaving(true); setError(""); const form = new FormData(e.currentTarget); const response = await fetch("/api/books", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({title:form.get("title"), author:form.get("author"), totalChapters:Number(form.get("totalChapters"))})}); const data = await response.json(); setSaving(false); if (!response.ok) setError(data.error); else onCreated(data); }
  return <Modal title="Create a new book" subtitle="Set up your book. You can add the audio chapters next." onClose={onClose}><form onSubmit={submit}><label>Book title<input name="title" required autoFocus placeholder="e.g. The Midnight Library"/></label><label>Author<input name="author" required placeholder="Author name"/></label><label>Total chapters<input name="totalChapters" type="number" required min="1" max="500" placeholder="12"/></label>{error && <p className="error">{error}</p>}<button className="primary submit" disabled={saving}>{saving ? <Loader2 className="spin"/> : <Plus/>}{saving ? "Creating…" : "Create book"}</button></form></Modal>;
}

function UploadChapter({ book, onClose, onUploaded }: { book: Book; onClose: () => void; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); if (!file) return setError("Choose an audio file."); setSaving(true); const data = new FormData(e.currentTarget); data.set("audio", file); const response = await fetch(`/api/books/${book.id}/chapters`, {method:"POST", body:data}); const json = await response.json(); setSaving(false); if (!response.ok) setError(json.error); else onUploaded(); }
  return <Modal title={`Add chapter ${book.chapters.length + 1}`} subtitle={`Upload audio to “${book.title}”.`} onClose={onClose}><form onSubmit={submit}><label>Chapter title<input name="title" required autoFocus placeholder={`Chapter ${book.chapters.length + 1}`}/></label><label className={`dropzone ${file ? "has-file" : ""}`}><input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)}/>{file ? <><Check/><b>{file.name}</b><small>{(file.size / 1048576).toFixed(1)} MB · Ready to upload</small></> : <><Upload/><b>Choose an audio file</b><small>MP3, M4A, WAV, or AAC</small></>}</label>{error && <p className="error">{error}</p>}<button className="primary submit" disabled={saving}>{saving ? <Loader2 className="spin"/> : <Upload/>}{saving ? "Uploading…" : "Upload chapter"}</button></form></Modal>;
}

function Player({ book, chapter, index, isPlaying, loop, progress, duration, onToggle, onLoop, onNext, onPrev, onSeek }: { book: Book; chapter: Chapter; index: number; isPlaying: boolean; loop: boolean; progress: number; duration: number; onToggle: () => void; onLoop: () => void; onNext: () => void; onPrev: () => void; onSeek: (v:number) => void }) {
  const time = (s:number) => Number.isFinite(s) ? `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}` : "0:00";
  return <div className="player"><div className="now-playing"><div className="mini-cover" style={{background:book.accent}}><BookOpen/></div><div><small>NOW PLAYING · CHAPTER {index + 1}</small><b>{chapter.title}</b><span>{book.title}</span></div></div><div className="player-center"><div className="controls"><button onClick={onPrev} disabled={index === 0}><ChevronLeft/></button><button className="main-play" onClick={onToggle}>{isPlaying ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}</button><button onClick={onNext} disabled={index === book.chapters.length - 1}><ChevronRight/></button><button className={loop ? "loop-on" : ""} onClick={onLoop} title="Loop chapter"><Repeat2/></button></div><div className="timeline"><span>{time(progress)}</span><input type="range" min="0" max={duration || 0} value={progress} onChange={(e) => onSeek(Number(e.target.value))}/><span>{time(duration)}</span></div></div><div className="volume"><Volume2/><span>Chapter {index + 1} of {book.chapters.length}</span></div></div>;
}
