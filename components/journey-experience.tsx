"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, CircleHelp, Maximize2, Minimize2, Pause, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import JourneyScene from "@/components/journey-scene";
import chapterData from "@/lib/chapters.json";

type Chapter = { id: string; label: string; title: string; date: string; narrative: string; milestones: {date: string; title: string; description: string}[]; sources: {title: string; url: string}[]; };
const chapters = chapterData as Chapter[];
const shortLabels = ["The first spark", "The ancient world", "An age of exchange", "A new perspective", "Forces of change", "The invisible world", "The connected mind", "Beyond the horizon"];
const shortDates = ["PREHISTORY", "3000 BCE", "500 CE", "1543", "1700", "1900", "1956", "TOMORROW"];
const DURATION = 26000;

function Mark({ className = "" }: {className?: string}) {
  return <svg className={className} width="35" height="35" viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth=".9"/><ellipse cx="24" cy="24" rx="23" ry="8" stroke="currentColor" strokeWidth=".9" transform="rotate(-48 24 24)"/><ellipse cx="24" cy="24" rx="23" ry="8" stroke="currentColor" strokeWidth=".9" transform="rotate(48 24 24)"/><circle cx="24" cy="24" r="2.5" fill="currentColor"/></svg>;
}

export default function Home() {
  const [chapter, setChapter] = useState(-1);
  const [modal, setModal] = useState<"about" | "chapters" | "discover" | null>(null);
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const scrollLock = useRef(0);
  const touchY = useRef(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const current = chapter >= 0 ? chapters[chapter] : null;
  const selectChapter = useCallback((index: number) => {
    setChapter(Math.max(-1, Math.min(7, index)));
    setProgress(0);
    setModal(null);
  }, []);
  const next = useCallback(() => { if (chapter < 7) selectChapter(chapter + 1); else { setPlaying(false); selectChapter(-1); } }, [chapter, selectChapter]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(media.matches);
    change(); media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (modal || e.ctrlKey || Math.abs(e.deltaY) < 20 || Date.now() - scrollLock.current < 1200) return;
      scrollLock.current = Date.now();
      setPlaying(false);
      selectChapter(chapter + (e.deltaY > 0 ? 1 : -1));
    };
    const onKey = (e: KeyboardEvent) => {
      if (modal || (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
      if (["ArrowRight", "ArrowDown", "PageDown"].includes(e.key)) { e.preventDefault(); setPlaying(false); next(); }
      if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); setPlaying(false); selectChapter(chapter - 1); }
      if (e.code === "Space" && !(e.target instanceof HTMLElement && /BUTTON|A/.test(e.target.tagName))) { e.preventDefault(); if (chapter < 0) selectChapter(0); setPlaying(v => !v); }
      if (e.key === "Home") { setPlaying(false); selectChapter(-1); }
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("wheel", onWheel); window.removeEventListener("keydown", onKey); };
  }, [chapter, modal, next, selectChapter]);

  useEffect(() => {
    if (!playing || modal || chapter < 0) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - last; last = now;
      if (!document.hidden) setProgress(p => Math.min(1, p + elapsed / DURATION));
    }, 100);
    return () => clearInterval(timer);
  }, [playing, modal, chapter]);
  useEffect(() => {
    if (progress < 1) return;
    if (chapter === 7) { setPlaying(false); setProgress(0); } else selectChapter(chapter + 1);
  }, [progress, chapter, selectChapter]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (modal && !dialog.open) dialog.showModal();
    else if (!modal && dialog.open) dialog.close();
  }, [modal]);
  useEffect(() => {
    const change = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  useEffect(() => () => { void audioRef.current?.close(); }, []);

  async function toggleSound() {
    const enabled = !sound;
    if (!audioRef.current && enabled) {
      const ctx = new AudioContext(); const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
      [55, 82.41, 110, 164.81].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const voice = ctx.createGain(); osc.type = "sine"; osc.frequency.value = freq;
        voice.gain.value = i === 0 ? .27 : .08; osc.connect(voice); voice.connect(gain); osc.start();
        const lfo = ctx.createOscillator(); const depth = ctx.createGain(); lfo.frequency.value = .07 + i * .018; depth.gain.value = .02;
        lfo.connect(depth); depth.connect(voice.gain); lfo.start();
      });
      audioRef.current = ctx; gainRef.current = gain;
    }
    await audioRef.current?.resume();
    if (audioRef.current && gainRef.current) gainRef.current.gain.setTargetAtTime(enabled ? .23 : 0, audioRef.current.currentTime, .7);
    setSound(enabled);
  }
  async function toggleFullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { /* Browser may restrict fullscreen in embedded preview. */ }
  }

  return <main className={`experience ${chapter < 0 ? "is-intro" : "is-chapter"}`} onTouchStart={e => { touchY.current = e.touches[0].clientY; }} onTouchEnd={e => { if (modal) return; const delta = touchY.current - e.changedTouches[0].clientY; if (Math.abs(delta) > 65) { setPlaying(false); selectChapter(chapter + (delta > 0 ? 1 : -1)); } }}>
    <div className="cosmic-background" aria-hidden="true" />
    <div className="scene-wrap"><JourneyScene chapter={chapter} reducedMotion={reducedMotion} onReady={() => setReady(true)} /></div>
    <div className="vignette" aria-hidden="true" />
    <div className="grain" aria-hidden="true" />
    <header className="header">
      <button className="brand" onClick={() => { setPlaying(false); selectChapter(-1); }} aria-label="The Future — return to introduction"><Mark /><span>THE FUTURE<span className="brand-subtitle">A HISTORY OF WONDER</span></span></button>
      <nav className="header-nav" aria-label="Main navigation"><button className="nav-link" onClick={() => setModal("about")}>The experience <ArrowUpRight size={12} /></button><button className="nav-link" onClick={() => setModal("chapters")}>Explore the eras <span className="tiny-grid">▦</span></button></nav>
      <div className="header-controls"><button className={`sound-toggle ${sound ? "sound-on" : ""}`} onClick={toggleSound} aria-pressed={sound} aria-label={sound ? "Mute ambient sound" : "Enable ambient sound"}>{sound ? <Volume2 size={15}/> : <VolumeX size={15}/>}<span>Sound {sound ? "on" : "off"}</span><span className="sound-bars" aria-hidden="true"><i/><i/><i/><i/></span></button><button className="icon-button fullscreen" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}>{fullscreen ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}</button></div>
    </header>

    <div className="hero-coordinate"><span className="coordinate-cross">+</span><span>HUMAN CURIOSITY / AN ONGOING EXPERIMENT</span><span className="coordinate-line"/></div>
    <section className="narrative" aria-live="polite" aria-atomic="true">
      <div key={chapter} className="narrative-inner">
        <div className="eyebrow"><span className="gold-line"/>{current ? <>CHAPTER {String(chapter + 1).padStart(2, "0")} <span className="eyebrow-divider">/</span> {current.label.toUpperCase()}</> : "AN ODYSSEY THROUGH SCIENCE"}</div>
        {current ? <><div className="chapter-date">{current.date}</div><h1 className="chapter-title">{current.title}</h1><p className="description chapter-description">{current.narrative}</p><div className="chapter-actions"><button className="primary-button" onClick={() => setModal("discover")}>Discover this era <ArrowUpRight size={17}/></button><button className="text-button" onClick={() => setPlaying(v => !v)}>{playing ? <Pause size={14}/> : <Play size={14}/>} {playing ? "Pause journey" : "Play journey"}</button></div><p className="chapter-footnote">{chapter === 7 ? "A POSSIBLE FUTURE, NOT A PREDICTION" : "FOLLOW THE THREAD OF DISCOVERY"}</p></> : <><h1 className="intro-title">A history<br/>of <em>wonder.</em></h1><p className="description">From the first spark of curiosity to the dawn of superintelligence. A journey through the ideas that changed everything.</p><div className="intro-actions"><button className="primary-button" onClick={() => selectChapter(0)}>Begin the journey <ArrowRight size={18}/></button><span className="journey-length">8 CHAPTERS <span>·</span> ONE HUMAN STORY</span></div></>}
      </div>
    </section>

    <div className="scene-caption"><span className="caption-cross">+</span><div><span className="caption-top">{current ? String(chapter + 1).padStart(2, "0") + " / 08" : "FROM OBSERVATION TO POSSIBILITY"}</span><span className="caption-bottom">{chapter === 7 ? "THE UNWRITTEN CHAPTER" : chapter < 0 ? "THE UNIVERSE IS WAITING." : current?.label.toUpperCase()}</span></div></div>
    <div className="scene-status"><span className={`status-dot ${ready ? "loaded" : ""}`}/>{ready ? "A LIVING EXPLORATION" : "CALIBRATING THE OBSERVATORY"}</div>
    <button className="scroll-cue" onClick={() => { setPlaying(false); next(); }}><span>{chapter === 7 ? "BACK TO THE BEGINNING" : "SCROLL TO TRAVEL THROUGH TIME"}</span><ArrowDown size={15}/></button>

    <footer className="timeline-footer">
      <div className="timeline-topline"><span className="timeline-heading">THE ARC OF DISCOVERY</span><span className="timeline-center">{chapter < 0 ? "EVERY ANSWER BEGINS WITH A QUESTION." : "ONE DISCOVERY OPENS A THOUSAND DOORS."}</span><div className="timeline-counter"><span>{chapter < 0 ? "00" : String(chapter + 1).padStart(2, "0")}</span><span>/ 08</span><button onClick={() => { setPlaying(false); selectChapter(-1); }} aria-label="Restart journey" title="Restart journey"><RotateCcw size={12}/></button></div></div>
      <nav className="timeline" aria-label="Journey chapters">{chapters.map((item, index) => <button key={item.id} className={`era ${chapter === index ? "active" : ""} ${chapter > index ? "visited" : ""}`} aria-current={chapter === index ? "step" : undefined} onClick={() => { setPlaying(false); selectChapter(index); }}><span className="era-line"><span className="era-dot">{chapter > index ? <Check size={7}/> : ""}</span><span className="era-connection" style={chapter === index && playing ? {background: `linear-gradient(to right, var(--gold) ${progress * 100}%, #32312b ${progress * 100}%)`} : {}}/></span><span className="era-heading"><span className="era-number">{String(index + 1).padStart(2,"0")}</span>{shortLabels[index]}</span><span className="era-date">{shortDates[index]}</span></button>)}</nav>
      <div className="timeline-baseline"><span>LOOK BACK. WONDER. LOOK AHEAD.</span><span className="keyboard-hint"><kbd>←</kbd><kbd>→</kbd> TO EXPLORE <span className="baseline-separator">/</span><kbd>SPACE</kbd> TO PLAY</span><button onClick={() => setModal("about")} aria-label="About this experience"><CircleHelp size={12}/> ABOUT THIS EXPERIENCE</button></div>
    </footer>

    <dialog aria-label={modal === "about" ? "About the experience" : modal === "chapters" ? "Choose a chapter" : "Discover this era"} ref={dialogRef} className={`experience-dialog ${modal === "chapters" ? "chapters-dialog" : ""}`} onCancel={() => setModal(null)} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}><div className="dialog-content"><button className="close-dialog icon-button" onClick={() => setModal(null)} aria-label="Close dialog"><X size={20}/></button>
      {modal === "about" && <><div className="eyebrow"><span className="gold-line"/>THE EXPERIENCE</div><h2>Curiosity is<br/>our <em>constant.</em></h2><p>We looked at the stars. We asked why. And slowly, together, we learned to see a little further.</p><p>This is a journey through that shared inheritance: the observations, exchanges, experiments, and extraordinary ideas that shaped science across cultures.</p><p>Our final chapter imagines a possible future with superintelligence. Its arrival, timing, and consequences remain uncertain. The future is still ours to question.</p><div className="about-instructions"><div><ArrowDown size={17}/><span>Scroll or swipe<br/><small>Move through the eras</small></span></div><div><Play size={17}/><span>Play the journey<br/><small>About 3½ minutes, at your pace</small></span></div><div><Volume2 size={17}/><span>Set the atmosphere<br/><small>Optional ambient sound</small></span></div></div><p className="dialog-note">Historical periods overlap; chapter boundaries are a narrative guide. Sources for each era are available under “Discover this era.” Reduced motion follows your device preference.</p><a className="source-link" href="https://github.com/isiliconx/thefuture" target="_blank" rel="noreferrer">Explore the project <ArrowUpRight size={14}/></a></>}
      {modal === "chapters" && <><div className="eyebrow"><span className="gold-line"/>CHOOSE YOUR MOMENT</div><h2>Eight chapters.<br/><em>Endless possibility.</em></h2><div className="chapter-list">{chapters.map((item,index) => <button key={item.id} onClick={() => { setPlaying(false); selectChapter(index); }}><span className="chapter-list-number">{String(index+1).padStart(2,"0")}</span><span><strong>{item.label}</strong><small>{item.date}</small></span><ArrowUpRight size={18}/></button>)}</div></>}
      {modal === "discover" && current && <><div className="eyebrow"><span className="gold-line"/>CHAPTER {String(chapter+1).padStart(2,"0")} / {current.date}</div><h2>{current.title}</h2><p>{current.narrative}</p><div className="milestones">{current.milestones.map(item => <article key={item.title}><span>{item.date}</span><div><h3>{item.title}</h3><p>{item.description}</p></div></article>)}</div><div className="sources"><span className="eyebrow">FOLLOW YOUR CURIOSITY</span>{current.sources.map(source => <a href={source.url} key={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={13}/></a>)}</div><button className="text-button next-era" onClick={() => { setPlaying(false); next(); }}>{chapter === 7 ? "Return to the beginning" : "Continue to the next era"}<ArrowRight size={15}/></button></>}
    </div></dialog>
  </main>;
}
