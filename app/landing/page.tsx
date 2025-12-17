'use client';

import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  Zap, 
  Target, 
  Users, 
  Code, 
  Trophy, 
  ArrowRight, 
  Github, 
  ChevronDown,
  Sparkles,
  BookOpen,
  BarChart3,
  Layers
} from 'lucide-react';

// Animated particles floating in background
function ParticleField() {
  const particles = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 10,
  }));

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-cyan-400"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            filter: 'blur(0.5px)',
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.1, 0.4, 0.1],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// Animated gradient mesh background
function GradientMesh() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Primary cyan glow */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
          left: '50%',
          top: '20%',
          transform: 'translate(-50%, -50%)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Secondary blue glow */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
          left: '70%',
          top: '60%',
          transform: 'translate(-50%, -50%)',
        }}
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Accent purple glow */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
          left: '20%',
          top: '70%',
          transform: 'translate(-50%, -50%)',
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

// Animated pulse rings around logo
function PulseRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-cyan-500/30"
          style={{
            width: `${i * 150 + 100}px`,
            height: `${i * 150 + 100}px`,
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{
            duration: 4,
            delay: i * 0.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// Floating code snippets
function FloatingCode() {
  const codeSnippets = [
    { code: 'for(int i=0; i<n; i++)', x: 5, y: 15 },
    { code: 'dp[i] = max(dp[i-1], v[i])', x: 75, y: 25 },
    { code: 'while(l < r) mid = l+r>>1', x: 10, y: 65 },
    { code: 'dfs(node, visited)', x: 80, y: 75 },
    { code: 'return memo[state]', x: 60, y: 45 },
    { code: 'sort(a.begin(), a.end())', x: 15, y: 85 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {codeSnippets.map((snippet, i) => (
        <motion.div
          key={i}
          className="absolute text-cyan-500/[0.07] font-mono text-sm whitespace-nowrap select-none"
          style={{
            left: `${snippet.x}%`,
            top: `${snippet.y}%`,
          }}
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
            opacity: [0.05, 0.12, 0.05],
          }}
          transition={{
            duration: 15 + i * 3,
            delay: i * 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {snippet.code}
        </motion.div>
      ))}
    </div>
  );
}

// Animated counter for stats
function AnimatedCounter({ value, suffix = '', label }: { value: number; suffix?: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return (
    <motion.div
      ref={ref}
      className="text-center"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="text-4xl md:text-5xl font-bold text-white mb-2">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-zinc-400">{label}</div>
    </motion.div>
  );
}

// Feature card component
function FeatureCard({ icon: Icon, title, description, delay, gradient }: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay: number;
  gradient: string;
}) {
  return (
    <motion.div
      className="group relative bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm overflow-hidden"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -5, borderColor: 'rgba(6, 182, 212, 0.3)' }}
    >
      {/* Hover gradient effect */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`} />
      
      <div className="relative z-10">
        <motion.div
          className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors"
          whileHover={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.5 }}
        >
          <Icon className="w-6 h-6 text-cyan-400" />
        </motion.div>
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-zinc-400 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

// Platform badge component
function PlatformBadge({ name, color, delay }: { name: string; color: string; delay: number }) {
  return (
    <motion.div
      className={`px-5 py-2.5 rounded-xl border ${color} bg-zinc-900/50 backdrop-blur-sm`}
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ scale: 1.05, y: -2 }}
    >
      <span className="font-semibold">{name}</span>
    </motion.div>
  );
}

// Main landing page component
export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.15], [0, 50]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#09090b] text-white overflow-x-hidden">
      {/* Background effects */}
      <GradientMesh />
      <ParticleField />
      
      {/* Grid pattern overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />
      
      {/* Navigation */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-zinc-800/50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
          >
            <div className="relative">
              <Activity className="w-7 h-7 text-cyan-400" />
              <motion.div
                className="absolute inset-0 bg-cyan-400/30 rounded-full blur-md"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <span className="text-xl font-bold">CPulse</span>
          </motion.div>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-zinc-400 hover:text-white transition-colors px-4 py-2"
            >
              Login
            </Link>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/signup"
                className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-xl transition-colors"
              >
                Get Started
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.section
        className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20"
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
      >
        <PulseRings />
        <FloatingCode />
        
        <div className="text-center z-10 max-w-5xl">
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 text-sm font-medium">Track • Solve • Improve</span>
          </motion.div>
          
          {/* Main heading */}
          <motion.h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-[1.1] tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Your Competitive
            <br />
            <span className="relative">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
                Programming Pulse
              </span>
              <motion.span
                className="absolute -inset-1 bg-gradient-to-r from-cyan-400/20 via-blue-500/20 to-purple-500/20 blur-2xl"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </span>
          </motion.h1>
          
          {/* Subtitle */}
          <motion.p
            className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            One unified platform to track, organize, and master problems from 
            Codeforces, LeetCode, AtCoder, and CodeChef. Built for competitive programmers.
          </motion.p>
          
          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
            >
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
              >
                Start for Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
            >
              <Link
                href="https://github.com"
                target="_blank"
                className="inline-flex items-center gap-2 px-8 py-4 bg-zinc-800 text-white font-semibold rounded-xl border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700 transition-all"
              >
                <Github className="w-5 h-5" />
                View on GitHub
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
        >
          <ChevronDown className="w-8 h-8 text-zinc-500" />
        </motion.div>
      </motion.section>

      {/* Platforms Section */}
      <section className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-zinc-400 mb-8 text-lg">Supports all major competitive programming platforms</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <PlatformBadge name="Codeforces" color="border-blue-500/40 text-blue-400" delay={0} />
              <PlatformBadge name="LeetCode" color="border-orange-500/40 text-orange-400" delay={0.1} />
              <PlatformBadge name="AtCoder" color="border-emerald-500/40 text-emerald-400" delay={0.2} />
              <PlatformBadge name="CodeChef" color="border-amber-500/40 text-amber-400" delay={0.3} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 border-y border-zinc-800/50 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <AnimatedCounter value={100000} suffix="+" label="Problems Tracked" />
          <AnimatedCounter value={50000} suffix="+" label="Active Users" />
          <AnimatedCounter value={4} label="Platforms" />
          <AnimatedCounter value={99} suffix="%" label="Uptime" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <motion.span
              className="inline-block px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-sm font-medium mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              Features
            </motion.span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Everything You Need</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              A complete toolkit for competitive programmers to organize, track, and improve their skills.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Code}
              title="Multi-Platform Parsing"
              description="Automatically parse problems from Codeforces, LeetCode, AtCoder, and CodeChef with a single click."
              delay={0}
              gradient="bg-gradient-to-br from-cyan-500/5 to-transparent"
            />
            <FeatureCard
              icon={Layers}
              title="Smart Codelists"
              description="Create playlists for problems. Group by topic, difficulty, contest, or any way you like."
              delay={0.1}
              gradient="bg-gradient-to-br from-blue-500/5 to-transparent"
            />
            <FeatureCard
              icon={Trophy}
              title="Progress Tracking"
              description="Track solved problems, filter by status, and visualize your improvement over time."
              delay={0.2}
              gradient="bg-gradient-to-br from-purple-500/5 to-transparent"
            />
            <FeatureCard
              icon={Zap}
              title="Built-in Code Editor"
              description="Monaco-powered editor with syntax highlighting for C++, Python, Java, and more."
              delay={0.3}
              gradient="bg-gradient-to-br from-amber-500/5 to-transparent"
            />
            <FeatureCard
              icon={BookOpen}
              title="Notes & Solutions"
              description="Add personal notes, save your solutions, and build your own knowledge base."
              delay={0.4}
              gradient="bg-gradient-to-br from-emerald-500/5 to-transparent"
            />
            <FeatureCard
              icon={BarChart3}
              title="Real-time Sync"
              description="Your data syncs instantly across all devices with cloud storage."
              delay={0.5}
              gradient="bg-gradient-to-br from-rose-500/5 to-transparent"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-28 px-6">
        <motion.div
          className="max-w-4xl mx-auto text-center relative"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-3xl blur-3xl" />
          
          <div className="relative bg-zinc-900/50 border border-zinc-800 rounded-3xl p-12 backdrop-blur-sm">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full mb-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-zinc-300">Free to use, forever</span>
            </motion.div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Ready to Level Up?</h2>
            <p className="text-zinc-400 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of competitive programmers tracking their progress with CPulse.
            </p>
            
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
            >
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors"
              >
                Get Started for Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-zinc-800/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold">CPulse</span>
          </div>
          
          <p className="text-zinc-500 text-sm">
            © {new Date().getFullYear()} CPulse. All rights reserved.
          </p>
          
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-zinc-400 hover:text-white text-sm transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-zinc-400 hover:text-white text-sm transition-colors">
              Terms
            </Link>
            <Link href="https://github.com" target="_blank" className="text-zinc-400 hover:text-white transition-colors">
              <Github className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
