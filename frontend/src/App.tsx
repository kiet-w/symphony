import { motion } from "motion/react";
import { Terminal, LockKey, Lightning, GithubLogo, ArrowRight } from "@phosphor-icons/react";

// ponytail: All-in-one minimal landing page. No unrequested router/components.
export default function App() {
  return (
    <div className="min-h-[100dvh] flex flex-col font-sans">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <Lightning weight="fill" className="w-5 h-5 text-[#22C55E]" />
          <span>Symphony MCP</span>
        </div>
        <a 
          href="https://github.com/kiet-w/symphony" 
          target="_blank" 
          rel="noreferrer"
          className="flex items-center gap-2 text-sm font-medium hover:text-[#22C55E] transition-colors duration-200"
        >
          <GithubLogo weight="fill" className="w-4 h-4" />
          <span>GitHub</span>
        </a>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center px-6 md:px-12 max-w-7xl mx-auto w-full py-12 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Copy */}
          <div className="flex flex-col items-start space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E293B] border border-slate-700 text-xs font-mono tracking-widest uppercase text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              Zero-Ops Multi-Agent
            </div>
            
            <h1 className="text-5xl md:text-7xl font-semibold tracking-tighter leading-[1.1]">
              Coordinate AI agents <br/>
              <span className="text-slate-400">without the chaos.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-400 max-w-[45ch] leading-relaxed">
              A high-performance Model Context Protocol server that turns GitHub Projects V2 into an atomic lock-safe command center for autonomous agents.
            </p>
            
            <a 
              href="#setup"
              className="group flex items-center gap-2 bg-[#F8FAFC] text-[#0F172A] px-6 py-3 rounded-md font-medium hover:bg-[#22C55E] hover:text-[#0F172A] transition-all duration-300 active:scale-95"
            >
              Start Building
              <ArrowRight weight="bold" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          {/* Right: Graphic */}
          <motion.div 
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full bg-[#1E293B] border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs font-mono text-slate-400">claude_desktop_config.json</span>
            </div>
            <div className="p-6 overflow-x-auto">
              <pre className="font-mono text-sm leading-relaxed text-slate-300">
                <code className="language-json">
{`{
  "mcpServers": {
    "symphony": {
      "command": "bun",
      "args": ["run", "src/server.ts"],
      "env": {
        "GITHUB_TOKEN": "ghp_...",
        "GITHUB_OWNER": "kiet-w",
        "GITHUB_REPO": "symphony",
        "GITHUB_PROJECT_NUMBER": "1"
      }
    }
  }
}`}
                </code>
              </pre>
            </div>
          </motion.div>
        </div>

        {/* Features Bento */}
        <div id="setup" className="mt-32 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard 
            icon={<LockKey className="w-6 h-6 text-[#22C55E]" />}
            title="Atomic SQLite Locks"
            desc="Built-in bun:sqlite guarantees race-condition free agent coordination. No Redis needed."
            delay={0.1}
          />
          <FeatureCard 
            icon={<GithubLogo className="w-6 h-6 text-indigo-400" />}
            title="GitHub Projects Sync"
            desc="Tickets move automatically as agents claim and complete them in real-time."
            delay={0.2}
          />
          <FeatureCard 
            icon={<Terminal className="w-6 h-6 text-amber-400" />}
            title="Push-based Logging"
            desc="Agents receive instant server notifications. Zero polling, minimal token overhead."
            delay={0.3}
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode, title: string, desc: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col space-y-4 p-8 rounded-xl bg-[#1E293B]/50 border border-slate-800 hover:border-slate-700 transition-colors"
    >
      <div className="w-12 h-12 rounded-full bg-[#0F172A] border border-slate-800 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="text-slate-400 leading-relaxed text-sm">
        {desc}
      </p>
    </motion.div>
  );
}
