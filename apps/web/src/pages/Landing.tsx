import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.reveal-line',
        { y: '110%' },
        { y: '0%', duration: 1.2, ease: "power4.out", stagger: 0.1 }
      );
      
      gsap.fromTo('.fade-in', 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1, delay: 0.8, ease: "power2.out" }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-paper text-ink font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-5 flex justify-between items-center mix-blend-difference text-white font-mono text-[11px] uppercase tracking-wider">
        <div className="font-sans font-semibold text-[15px] tracking-tight">
          JOBAGENT<span className="text-[7px] align-top ml-[2px]">®</span>
        </div>
        <nav className="flex gap-8">
          <Link to="/login" className="hover:text-acid transition-colors">I. Login</Link>
          <Link to="/register" className="hover:text-acid transition-colors">II. Register</Link>
        </nav>
      </header>

      {/* Hero */}
      <section ref={heroRef} className="min-h-screen px-6 pt-24 pb-12 flex flex-col justify-between">
        <div className="grid grid-cols-3 font-mono text-[10px] uppercase tracking-widest pt-4">
          <span>AI Job Agent</span>
          <span className="text-center">Autonomous Search</span>
          <span className="text-right">Available now — 2026</span>
        </div>

        <h1 className="text-[clamp(60px,12vw,220px)] leading-[0.75] tracking-[-0.075em] font-medium my-auto py-12">
          <span className="block overflow-hidden pb-2"><span className="block reveal-line">FETCH</span></span>
          <span className="block overflow-hidden pb-2 pl-[15vw] text-acid"><span className="block reveal-line">MATCH</span></span>
          <span className="block overflow-hidden pb-2"><span className="block reveal-line">HIRED<span className="text-acid">.</span></span></span>
        </h1>

        <div className="flex justify-between items-end border-t border-line pt-4 fade-in">
          <p className="max-w-[460px] text-sm leading-relaxed m-0 font-sans">
            Stop endlessly scrolling through job boards. We deploy autonomous AI agents to search, filter, and rank the best opportunities matched perfectly to your profile.
          </p>
          <span className="font-mono text-[10px] uppercase tracking-widest">Scroll to explore ↓</span>
        </div>
      </section>

      {/* Manifesto */}
      <section className="px-6 py-[20vh] grid grid-cols-1 md:grid-cols-[1fr_3fr] border-t border-line">
        <p className="font-mono text-[10px] uppercase tracking-widest mb-8 md:mb-0">01 / The Problem</p>
        <p className="font-serif text-[clamp(32px,4.5vw,80px)] leading-[1.05] m-0 max-w-[1200px]">
          Job hunting is broken. Thousands of identical listings, ghosting recruiters, and endless noise. We cut the static by automating the discovery and evaluation process entirely.
        </p>
      </section>

      {/* Features Grid */}
      <section className="px-6 pb-[20vh]">
        <div className="flex justify-between border-b border-line pb-4 mb-16 font-mono text-[10px] uppercase tracking-widest">
          <p>02 / Capabilities</p>
          <p>(System Overview)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[8vw]">
          <div className="border-t border-line pt-4 md:mt-[10vh]">
            <div className="flex gap-4 font-mono text-[10px] uppercase tracking-widest mb-2">
              <span>I.</span>
              <h2 className="text-[clamp(34px,5vw,78px)] leading-[0.8] tracking-tight font-sans m-0">AGGREGATION</h2>
            </div>
            <p className="font-mono text-[10px] uppercase text-gray-500 max-w-sm mt-4">Continuous scanning of remote sources / AI-driven parsing</p>
          </div>

          <div className="border-t border-line pt-4">
            <div className="flex gap-4 font-mono text-[10px] uppercase tracking-widest mb-2">
              <span>II.</span>
              <h2 className="text-[clamp(34px,5vw,78px)] leading-[0.8] tracking-tight font-sans m-0">EVALUATION</h2>
            </div>
            <p className="font-mono text-[10px] uppercase text-gray-500 max-w-sm mt-4">Semantic matching algorithms / Profile alignment scoring</p>
          </div>

          <div className="border-t border-line pt-4 md:mt-[10vh]">
            <div className="flex gap-4 font-mono text-[10px] uppercase tracking-widest mb-2">
              <span>III.</span>
              <h2 className="text-[clamp(34px,5vw,78px)] leading-[0.8] tracking-tight font-sans m-0">UNIFIED BOARD</h2>
            </div>
            <p className="font-mono text-[10px] uppercase text-gray-500 max-w-sm mt-4">Single source of truth / Application tracking / Saved roles</p>
          </div>
        </div>
      </section>

      {/* Contact / CTA */}
      <section className="bg-acid px-6 py-6 min-h-[80vh] flex flex-col justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest">03 / Action</p>
        
        <div className="my-[12vh]">
          <h2 className="text-[clamp(60px,10vw,160px)] leading-[0.8] tracking-[-0.07em] font-medium m-0 mb-[8vh]">
            READY TO START?<br/><em className="font-serif italic font-normal">LET'S SEARCH.</em>
          </h2>
          <Link to="/register" className="font-serif text-[clamp(24px,4vw,56px)] border-b border-ink inline-block pb-1 hover:opacity-50 transition-opacity">
            Create an account ↗
          </Link>
        </div>

        <footer className="flex justify-between border-t border-line pt-4 font-mono text-[10px] uppercase tracking-widest flex-col md:flex-row gap-4">
          <span>JobAgent © {new Date().getFullYear()}</span>
          <div className="flex gap-6">
            <Link to="/login" className="hover:underline">Login</Link>
            <Link to="/register" className="hover:underline">Register</Link>
            <a href="#top" className="hover:underline">Back to top ↑</a>
          </div>
        </footer>
      </section>
    </div>
  );
}
