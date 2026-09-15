import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Briefcase, Sparkles, Target, Zap, LayoutDashboard, Shield, Users } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const horizontalSectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero Animation
      gsap.fromTo('.hero-text',
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, stagger: 0.2, ease: "power3.out" }
      );

      gsap.fromTo('.hero-card',
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, delay: 0.5, ease: "power3.out" }
      );

      // Horizontal Scroll Animation
      const cards = gsap.utils.toArray('.horizontal-card');
      
      gsap.to(cards, {
        xPercent: -100 * (cards.length - 1),
        ease: "none",
        scrollTrigger: {
          trigger: horizontalSectionRef.current,
          pin: true,
          scrub: 1,
          snap: 1 / (cards.length - 1),
          end: () => "+=" + (cardsRef.current?.offsetWidth || 2000),
        }
      });
      
      // Fade in bottom section
      gsap.fromTo('.fade-up', 
        { y: 50, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.8, stagger: 0.2, ease: "power2.out",
          scrollTrigger: {
            trigger: '.bottom-cta',
            start: 'top 80%',
          }
        }
      );

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-[#dce2e8] via-[#e8e9e1] to-[#f4ead2] font-sans overflow-x-hidden text-gray-900">
      
      {/* Top Navbar */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-[#fbfaf5]/80 backdrop-blur-md border-b border-white/40 shadow-sm">
        <div className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <div className="bg-[#2c2d30] p-1.5 rounded-lg text-white">
            <Zap size={20} />
          </div>
          JobAgent
        </div>
        <div className="flex gap-4">
          <Link to="/login" className="px-5 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
            Log in
          </Link>
          <Link to="/register" className="px-5 py-2 text-sm font-medium bg-[#2c2d30] text-white rounded-full hover:bg-black transition-all shadow-md">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-32 pb-20 px-6 min-h-[90vh] flex flex-col items-center justify-center text-center">
        <div className="max-w-4xl mx-auto z-10">
          <div className="hero-text inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-white/80 shadow-sm text-sm font-medium text-gray-600 mb-6 backdrop-blur-sm">
            <Sparkles size={16} className="text-yellow-500" />
            AI-Powered Job Searching
          </div>
          <h1 className="hero-text text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            Find your dream job <br className="hidden md:block" /> with intelligent matching
          </h1>
          <p className="hero-text text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Stop scrolling endlessly. Let our AI agent fetch, filter, and rank the best jobs tailored specifically to your profile and preferences.
          </p>
          <div className="hero-text flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/register" className="px-8 py-4 text-base font-semibold bg-[#2c2d30] text-white rounded-full hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2">
              Start Searching Free
              <ArrowRight size={18} />
            </Link>
            <a href="#how-it-works" className="px-8 py-4 text-base font-medium bg-white/70 text-gray-800 rounded-full hover:bg-white transition-all border border-white shadow-sm flex items-center justify-center">
              Learn More
            </a>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="hero-card absolute bottom-[-4rem] left-1/2 -translate-x-1/2 w-full max-w-5xl h-64 bg-white/50 backdrop-blur-md rounded-[3rem] border border-white/60 shadow-2xl -z-10 transform rotate-1"></div>
        <div className="hero-card absolute bottom-[-5rem] left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-[#fbfaf5]/80 backdrop-blur-lg rounded-[3rem] border border-white shadow-xl -z-20 transform -rotate-2"></div>
      </section>

      {/* Horizontal Scroll Section */}
      <section ref={horizontalSectionRef} id="how-it-works" className="h-screen flex items-center overflow-hidden bg-[#2c2d30] text-white">
        <div className="px-8 md:px-20 w-full">
          <div className="mb-12">
            <h2 className="text-4xl font-bold mb-4">How it works</h2>
            <p className="text-gray-400 max-w-xl">A seamless experience designed to put your career transition on autopilot.</p>
          </div>
          
          <div ref={cardsRef} className="flex gap-8 w-[300vw] md:w-[200vw] lg:w-[150vw]">
            <div className="horizontal-card w-full max-w-xl shrink-0 bg-[#3a3b3e] p-10 rounded-[2.5rem] border border-gray-700/50 shadow-2xl">
              <div className="bg-blue-500/20 text-blue-400 w-16 h-16 rounded-2xl flex items-center justify-center mb-8">
                <Target size={32} />
              </div>
              <h3 className="text-3xl font-semibold mb-4">1. Define Your Target</h3>
              <p className="text-gray-400 text-lg leading-relaxed">
                Set your preferences: salary, location, tech stack, and remote flexibility. The more specific you are, the better our AI understands what you want.
              </p>
            </div>

            <div className="horizontal-card w-full max-w-xl shrink-0 bg-[#3a3b3e] p-10 rounded-[2.5rem] border border-gray-700/50 shadow-2xl">
              <div className="bg-purple-500/20 text-purple-400 w-16 h-16 rounded-2xl flex items-center justify-center mb-8">
                <LayoutDashboard size={32} />
              </div>
              <h3 className="text-3xl font-semibold mb-4">2. Agent Aggregation</h3>
              <p className="text-gray-400 text-lg leading-relaxed">
                Our AI continuously scours the web, pulling in relevant opportunities from diverse sources directly to your personal dashboard. No more checking ten different sites.
              </p>
            </div>

            <div className="horizontal-card w-full max-w-xl shrink-0 bg-[#3a3b3e] p-10 rounded-[2.5rem] border border-gray-700/50 shadow-2xl">
              <div className="bg-yellow-500/20 text-yellow-400 w-16 h-16 rounded-2xl flex items-center justify-center mb-8">
                <Sparkles size={32} />
              </div>
              <h3 className="text-3xl font-semibold mb-4">3. Intelligent Ranking</h3>
              <p className="text-gray-400 text-lg leading-relaxed">
                Every fetched job is analyzed against your profile. We score the match percentage so you can focus strictly on the top 10% of roles that fit you perfectly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6 bg-gradient-to-t from-[#f4ead2] to-[#e8e9e1]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything you need</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">Powerful features wrapped in a beautiful, distraction-free interface.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/60 backdrop-blur-sm p-8 rounded-[2rem] border border-white/60 shadow-lg hover:shadow-xl transition-shadow">
              <Briefcase size={28} className="text-blue-600 mb-6" />
              <h3 className="text-xl font-semibold mb-3">Unified Dashboard</h3>
              <p className="text-gray-600">Track all your saved jobs and applications in one highly visual, organized space.</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm p-8 rounded-[2rem] border border-white/60 shadow-lg hover:shadow-xl transition-shadow">
              <Shield size={28} className="text-green-600 mb-6" />
              <h3 className="text-xl font-semibold mb-3">Privacy First</h3>
              <p className="text-gray-600">Your profile and search preferences remain private. We don't sell your data to recruiters.</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm p-8 rounded-[2rem] border border-white/60 shadow-lg hover:shadow-xl transition-shadow">
              <Users size={28} className="text-orange-600 mb-6" />
              <h3 className="text-xl font-semibold mb-3">Market Insights</h3>
              <p className="text-gray-600">Get context on salaries, tech trends, and company hiring velocity right on the job card.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bottom-cta py-32 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto bg-[#2c2d30] text-white rounded-[3rem] p-12 md:p-20 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
          
          <h2 className="fade-up text-4xl md:text-5xl font-bold mb-6 relative z-10">Ready to level up your career?</h2>
          <p className="fade-up text-gray-400 text-lg mb-10 max-w-xl mx-auto relative z-10">
            Join today and let our AI agent start doing the heavy lifting for your job search.
          </p>
          <div className="fade-up relative z-10">
            <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 text-lg font-medium bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-all shadow-lg">
              Create an account
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-500 text-sm border-t border-gray-300/50">
        <p>&copy; {new Date().getFullYear()} JobAgent. All rights reserved.</p>
      </footer>
    </div>
  );
}
