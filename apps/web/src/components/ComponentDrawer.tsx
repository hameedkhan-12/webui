"use client";

import React from 'react';
import { Layout, FileText, CheckSquare, MessageSquare, Plus, ArrowRight, Play, ShoppingCart } from 'lucide-react';
import { ComponentBlock } from '@repo/shared';

// Pre-built components with high-quality styled React + Tailwind CSS
export const COMPONENT_TEMPLATES: ComponentBlock[] = [
  {
    id: 'navbar-simple',
    name: 'Glassmorphic Header',
    description: 'Beautiful header with translucent glassmorphic navigation',
    category: 'layout',
    previewIcon: 'Layout',
    code: `
<header className="sticky top-0 z-50 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg">A</div>
    <span className="font-semibold text-lg bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">AuraLab</span>
  </div>
  <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
    <a href="#" className="hover:text-purple-400 transition-colors">Features</a>
    <a href="#" className="hover:text-purple-400 transition-colors">Showcase</a>
    <a href="#" className="hover:text-purple-400 transition-colors">Pricing</a>
    <a href="#" className="hover:text-purple-400 transition-colors">Docs</a>
  </nav>
  <button className="px-4 py-1.5 rounded-full bg-white text-slate-950 hover:bg-slate-200 transition-all text-sm font-medium">
    Launch App
  </button>
</header>
`
  },
  {
    id: 'hero-premium',
    name: 'Sleek Hero Banner',
    description: 'Stunning call-to-action hero banner with glowing neon overlays',
    category: 'layout',
    previewIcon: 'Layout',
    code: `
<section className="relative w-full py-20 px-6 flex flex-col items-center text-center overflow-hidden border-b border-white/5 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
  <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />
  <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
  
  <div className="z-10 max-w-3xl">
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/5 text-purple-300 text-xs font-medium mb-6">
      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
      Next-Gen UI Engine
    </span>
    <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
      Deploy Beautiful Web Apps <br />
      <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">Visually in Seconds</span>
    </h1>
    <p className="text-slate-400 text-lg sm:text-xl max-w-xl mx-auto mb-8 font-light leading-relaxed">
      A powerful drag-and-drop workspace combined with intelligent AI code co-piloting. Focus on your design, we write the code.
    </p>
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
      <button className="w-full sm:w-auto px-8 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all flex items-center justify-center gap-2">
        Get Started Free
        <ArrowRight size={16} />
      </button>
      <button className="w-full sm:w-auto px-8 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium transition-all">
        Watch Demo
      </button>
    </div>
  </div>
</section>
`
  },
  {
    id: 'feature-grid',
    name: 'Feature Grid',
    description: 'Gorgeous 3-column features card section with glowing icons',
    category: 'content',
    previewIcon: 'FileText',
    code: `
<section className="w-full py-16 px-6 max-w-7xl mx-auto border-b border-white/5">
  <div className="text-center max-w-2xl mx-auto mb-12">
    <h2 className="text-3xl font-bold text-white mb-4">Core Capabilities</h2>
    <p className="text-slate-400">Everything you need to launch beautiful responsive websites at lightning speed.</p>
  </div>
  
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-sm hover:border-purple-500/30 transition-all group">
      <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:bg-purple-600 group-hover:text-white transition-all">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">Lightning Speed</h3>
      <p className="text-slate-400 text-sm leading-relaxed">Built on top of Vite and compiled instantly inside your browser. No local setup needed.</p>
    </div>
    
    <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-sm hover:border-blue-500/30 transition-all group">
      <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">Enterprise Security</h3>
      <p className="text-slate-400 text-sm leading-relaxed">Your project sandboxes execute within highly secure isolated browser boundaries.</p>
    </div>
    
    <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-sm hover:border-pink-500/30 transition-all group">
      <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-6 group-hover:bg-pink-600 group-hover:text-white transition-all">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-pink-400 transition-colors">Pixel Perfect</h3>
      <p className="text-slate-400 text-sm leading-relaxed">Customize elements with Figma-style control bars or request direct modifications with AI.</p>
    </div>
  </div>
</section>
`
  },
  {
    id: 'ecommerce-card',
    name: 'E-commerce Card',
    description: 'Standard elegant product shopping card with rating badges',
    category: 'content',
    previewIcon: 'FileText',
    code: `
<div className="max-w-sm rounded-2xl border border-white/5 bg-slate-900/50 backdrop-blur-md overflow-hidden hover:border-purple-500/20 hover:scale-[1.01] transition-all duration-300">
  <div className="relative h-48 bg-gradient-to-tr from-indigo-950 to-slate-900 flex items-center justify-center p-6">
    <div className="absolute top-3 left-3 bg-purple-600/80 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide">NEW</div>
    <div className="w-24 h-24 rounded-full bg-purple-500/10 blur-[10px] absolute" />
    <span className="text-4xl text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)] font-bold">Aura-7</span>
  </div>
  <div className="p-6">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-lg font-semibold text-white">Smart Vision Pro</h3>
      <span className="text-purple-400 font-bold">$299.00</span>
    </div>
    <p className="text-slate-400 text-xs leading-relaxed mb-6">
      Advanced interactive mixed-reality HUD featuring seamless hand tracking and real-time environment projection.
    </p>
    <div className="flex items-center gap-1 mb-6 text-yellow-500">
      <span>★</span><span>★</span><span>★</span><span>★</span><span className="text-slate-600">★</span>
      <span className="text-slate-500 text-[10px] ml-2">(48 reviews)</span>
    </div>
    <button className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold tracking-wide shadow-lg shadow-purple-500/10 flex items-center justify-center gap-2 group transition-all">
      <ShoppingCart size={13} />
      Add to Basket
    </button>
  </div>
</div>
`
  },
  {
    id: 'contact-form',
    name: 'Contact Form',
    description: 'Elegant glassmorphic contact form card with input fields',
    category: 'form',
    previewIcon: 'CheckSquare',
    code: `
<div className="max-w-md w-full p-8 rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg">
  <div className="mb-6">
    <h3 className="text-xl font-bold text-white mb-1">Get In Touch</h3>
    <p className="text-slate-400 text-xs">Drop us a line and our expert team will respond in a heartbeat.</p>
  </div>
  <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
    <div>
      <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Full Name</label>
      <input type="text" placeholder="John Doe" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors" />
    </div>
    <div>
      <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Email Address</label>
      <input type="email" placeholder="john@example.com" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors" />
    </div>
    <div>
      <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Your Message</label>
      <textarea rows={4} placeholder="Tell us about your project goals..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"></textarea>
    </div>
    <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium text-sm shadow-lg shadow-purple-500/20 hover:brightness-110 active:scale-[0.98] transition-all">
      Send Message
    </button>
  </form>
</div>
`
  }
];

interface ComponentDrawerProps {
  onInsertComponent: (code: string) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'layout':
      return <Layout className="text-purple-400" size={16} />;
    case 'content':
      return <FileText className="text-blue-400" size={16} />;
    case 'form':
      return <CheckSquare className="text-pink-400" size={16} />;
    default:
      return <MessageSquare className="text-emerald-400" size={16} />;
  }
};

export const ComponentDrawer: React.FC<ComponentDrawerProps> = ({ onInsertComponent }) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

  const filteredTemplates = selectedCategory === 'all'
    ? COMPONENT_TEMPLATES
    : COMPONENT_TEMPLATES.filter(t => t.category === selectedCategory);

  const handleDragStart = (e: React.DragEvent, code: string) => {
    e.dataTransfer.setData('text/plain', code);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#070913]">
      <div className="p-4 border-b border-white/5">
        <h2 className="text-sm font-semibold text-white mb-1 uppercase tracking-wider">Visual blocks library</h2>
        <p className="text-xs text-slate-500 mb-4">Click or drag sections to visually compose your page layout instantly.</p>
        
        {/* Category Buttons */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['all', 'layout', 'content', 'form'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all border ${
                selectedCategory === cat
                  ? 'bg-purple-600/10 border-purple-500/30 text-purple-300'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            draggable
            onDragStart={(e) => handleDragStart(e, template.code)}
            onClick={() => onInsertComponent(template.code)}
            className="group flex flex-col p-4 rounded-xl border border-white/5 bg-slate-900/30 hover:border-purple-500/20 hover:bg-slate-900/50 cursor-pointer transition-all active:scale-[0.98]"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-white/5">
                  {getCategoryIcon(template.category)}
                </div>
                <h3 className="text-xs font-semibold text-slate-200 group-hover:text-purple-400 transition-colors">
                  {template.name}
                </h3>
              </div>
              <div className="p-1 rounded-full bg-white/5 border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus size={10} className="text-slate-300" />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              {template.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
