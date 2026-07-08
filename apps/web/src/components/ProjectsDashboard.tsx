"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import {
  Search,
  Plus,
  Star,
  MoreHorizontal,
  Copy,
  Trash2,
  ExternalLink,
  Home,
  FolderOpen,
  Users,
  HelpCircle,
  Megaphone,
  ChevronDown,
  Loader2,
  LayoutGrid,
  Clock,
} from 'lucide-react';
import { fetchProjects, createProject, deleteProject, duplicateProject, ProjectDto } from '../lib/projectsApi';

type SortKey = 'updatedAt' | 'createdAt' | 'name';
type NavItem = 'home' | 'projects' | 'starred' | 'recent' | 'shared';

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: 'Last edited', value: 'updatedAt' },
  { label: 'Created date', value: 'createdAt' },
  { label: 'Name', value: 'name' },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function relativeDate(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(delta / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return formatDate(iso);
}

// ─── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  project: ProjectDto;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [starred, setStarred] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div
      className="group relative flex flex-col rounded-xl border border-white/[0.07] bg-[#13151f] hover:border-white/[0.14] transition-all cursor-pointer overflow-hidden"
      onClick={onOpen}
    >
      {/* Thumbnail */}
      <div className="relative h-36 w-full bg-[#0d0f1a] flex items-center justify-center overflow-hidden">
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt={project.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-20">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-[20px] font-bold text-white">
              {project.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        {/* Star button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setStarred((v) => !v); }}
          className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all ${
            starred
              ? 'opacity-100 text-yellow-400'
              : 'opacity-0 group-hover:opacity-100 text-slate-500 hover:text-yellow-400'
          } bg-black/40 backdrop-blur-sm`}
        >
          <Star size={12} fill={starred ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-slate-200 truncate">{project.name}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">{relativeDate(project.updatedAt)}</p>
        </div>

        {/* Three-dot menu */}
        <div ref={menuRef} className="relative shrink-0 ml-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-200 hover:bg-white/[0.07] opacity-0 group-hover:opacity-100 transition-all"
          >
            <MoreHorizontal size={14} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 bottom-full mb-1 w-44 rounded-xl border border-white/[0.08] bg-[#1a1d2e] shadow-2xl shadow-black/60 py-1 z-50">
              {[
                { icon: ExternalLink, label: 'Open', action: onOpen },
                { icon: Copy, label: 'Duplicate', action: onDuplicate },
                { icon: Trash2, label: 'Delete', action: onDelete, danger: true },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); item.action(); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[11px] transition-colors ${
                    item.danger
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-slate-300 hover:bg-white/[0.05]'
                  }`}
                >
                  <item.icon size={12} />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New Project Dialog ────────────────────────────────────────────────────────

function NewProjectDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, prompt: string) => void;
}) {
  const [name, setName] = React.useState('');
  const [prompt, setPrompt] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[480px] rounded-2xl border border-white/[0.08] bg-[#0f1120] shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[15px] font-semibold text-white mb-1">New project</h3>
        <p className="text-[12px] text-slate-500 mb-5">Start with a blank canvas or describe what you want to build.</p>

        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Project name</label>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My awesome app"
              className="w-full bg-slate-900/60 border border-white/[0.08] rounded-xl px-3 py-2.5 text-[12px] text-white placeholder:text-slate-600 outline-none focus:border-purple-500/40 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Describe your app <span className="text-slate-600">(optional)</span></label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A SaaS dashboard with analytics, user management, and billing…"
              rows={3}
              className="w-full resize-none bg-slate-900/60 border border-white/[0.08] rounded-xl px-3 py-2.5 text-[12px] text-white placeholder:text-slate-600 outline-none focus:border-purple-500/40 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && name.trim()) {
                  e.preventDefault();
                  onCreate(name.trim(), prompt.trim());
                }
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[12px] text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => onCreate(name.trim(), prompt.trim())}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-[12px] font-semibold transition-all"
          >
            <Plus size={13} />
            Create project
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export function ProjectsDashboard() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [projects, setProjects] = React.useState<ProjectDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortKey, setSortKey] = React.useState<SortKey>('updatedAt');
  const [sortOpen, setSortOpen] = React.useState(false);
  const [activeNav, setActiveNav] = React.useState<NavItem>('projects');
  const [showNewProject, setShowNewProject] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  // Load projects
  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const token = await getToken({ skipCache: true });
      const data = await fetchProjects(token);
      setProjects(data);
      setLoading(false);
    })();
  }, [getToken]);

  const handleCreate = async (name: string, prompt: string) => {
    setCreating(true);
    setShowNewProject(false);
    const token = await getToken({ skipCache: true });
    const created = await createProject(name, token);
    if (created) {
      setProjects((prev) => [created, ...prev]);
      const url = prompt
        ? `/project/${created.id}?prompt=${encodeURIComponent(prompt)}`
        : `/project/${created.id}`;
      router.push(url);
    }
    setCreating(false);
  };

  const handleOpen = (project: ProjectDto) => {
    router.push(`/project/${project.id}`);
  };

  const handleDuplicate = async (project: ProjectDto) => {
    const token = await getToken({ skipCache: true });
    const duped = await duplicateProject(project.id, token);
    if (duped) setProjects((prev) => [duped, ...prev]);
  };

  const handleDelete = async (project: ProjectDto) => {
    const token = await getToken({ skipCache: true });
    const ok = await deleteProject(project.id, token);
    if (ok) setProjects((prev) => prev.filter((p) => p.id !== project.id));
  };

  // Filter + sort
  const sortFn = (a: ProjectDto, b: ProjectDto) => {
    if (sortKey === 'name') return a.name.localeCompare(b.name);
    return new Date(b[sortKey]).getTime() - new Date(a[sortKey]).getTime();
  };

  const filtered = projects
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort(sortFn);

  const NAV = [
    { id: 'home' as NavItem, icon: Home, label: 'Home' },
    { id: 'projects' as NavItem, icon: FolderOpen, label: 'Projects' },
    { id: 'starred' as NavItem, icon: Star, label: 'Starred' },
    { id: 'recent' as NavItem, icon: Clock, label: 'Recently viewed' },
    { id: 'shared' as NavItem, icon: Users, label: 'Shared with you' },
  ];

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.emailAddresses?.[0]?.emailAddress?.[0] ?? 'U').toUpperCase();

  return (
    <div className="flex h-screen w-full bg-[#0d0f1a] overflow-hidden">

      {/* ─── Left Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0a0c17]">

        {/* User header */}
        <div className="px-3 py-4 border-b border-white/[0.06]">
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/[0.04] transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-[12px] font-bold text-white shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[12px] font-semibold text-slate-200 truncate">
                {user?.fullName ?? user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] ?? 'User'}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px] text-slate-600 bg-slate-800/60 px-1.5 py-0.5 rounded-md font-medium">
                  Free
                </span>
              </div>
            </div>
            <ChevronDown size={12} className="text-slate-600 shrink-0" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all ${
                activeNav === item.id
                  ? 'bg-white/[0.07] text-white'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <item.icon size={14} className={activeNav === item.id ? 'text-purple-400' : ''} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer nav */}
        <div className="px-2 py-3 border-t border-white/[0.06] space-y-0.5">
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
          >
            <HelpCircle size={14} />
            Help Center
          </button>
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
          >
            <Megaphone size={14} />
            <span>Release notes</span>
            <span className="ml-auto text-[9px] bg-purple-600/30 text-purple-300 px-1.5 py-0.5 rounded-md font-semibold">
              New
            </span>
          </button>
        </div>
      </aside>

      {/* ─── Main Content ─────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className="shrink-0 px-8 py-6 border-b border-white/[0.06] flex items-center justify-between">
          <h1 className="text-[20px] font-semibold text-white">All projects</h1>
          <button
            type="button"
            onClick={() => setShowNewProject(true)}
            disabled={creating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-[13px] font-semibold transition-all shadow-lg shadow-purple-500/20"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create project
          </button>
        </div>

        {/* Search + Sort bar */}
        <div className="shrink-0 px-8 py-4 flex items-center gap-3 border-b border-white/[0.06]">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a project…"
              className="w-full bg-slate-900/40 border border-white/[0.07] rounded-xl pl-9 pr-4 py-2 text-[12px] text-slate-300 placeholder:text-slate-600 outline-none focus:border-purple-500/40 transition-colors"
            />
          </div>

          {/* Sort dropdown */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.07] bg-slate-900/40 text-[12px] text-slate-400 hover:border-white/[0.12] transition-colors min-w-[130px]"
            >
              {SORT_OPTIONS.find((o) => o.value === sortKey)?.label}
              <ChevronDown size={12} className="ml-auto text-slate-600" />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-white/[0.08] bg-[#1a1d2e] shadow-xl py-1 z-30">
                {SORT_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => { setSortKey(o.value); setSortOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-[12px] transition-colors ${
                      sortKey === o.value
                        ? 'text-purple-300 bg-purple-600/10'
                        : 'text-slate-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Layout toggle */}
          <button
            type="button"
            className="p-2 rounded-xl border border-white/[0.07] text-slate-400 hover:text-white hover:border-white/[0.12] transition-colors"
          >
            <LayoutGrid size={14} />
          </button>
        </div>

        {/* Project grid */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 size={24} className="animate-spin text-purple-500" />
              <p className="text-[12px] text-slate-600">Loading projects…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              {searchQuery ? (
                <>
                  <Search size={32} className="text-slate-800" />
                  <p className="text-[13px] text-slate-500">No projects matching "{searchQuery}"</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center">
                    <Plus size={24} className="text-purple-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-[14px] font-semibold text-white mb-1">No projects yet</p>
                    <p className="text-[12px] text-slate-500">Create your first project to get started</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewProject(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[12px] font-semibold transition-all"
                  >
                    <Plus size={13} />
                    New project
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={() => handleOpen(project)}
                  onDuplicate={() => handleDuplicate(project)}
                  onDelete={() => handleDelete(project)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* New project modal */}
      {showNewProject && (
        <NewProjectDialog
          onClose={() => setShowNewProject(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
