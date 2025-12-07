import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LabelList, Legend } from 'recharts';
import { Trash2, Lock, Plus, CheckCircle2, Ban, BarChart3, Settings as SettingsIcon, Volume2, Power, MousePointerClick, Square, Globe, ChevronDown, ChevronRight, Folder, Download, ArrowUpRight, ArrowDownRight, ArrowRight, X, Pencil, Check, GripVertical, CornerDownRight, Zap, EyeOff, Layers, BookOpen, Feather, Sparkles, Clock, Scroll, Brain, AlertCircle, Coffee } from 'lucide-react';
import { BlockedSite, AppSettings, AppMetrics } from '../src/types';
import { getRandomQuote } from '../services/staticQuotes';
import { hashToTab, tabToHash } from '../src/tabHash';
import { computeDomainBlockStats } from '../src/analyticsUtils';
import { buildConflictMessage, categoryHasConflicts, getDomainConflicts, hasSiteConflicts } from '../src/conflictUtils';

interface DashboardProps {
  blockedSites: BlockedSite[];
  stats: { name: string; value: number }[];
  metrics: AppMetrics;
  categoryDefinitions: Record<string, string[]>;
  addSite: (domain: string, type: 'domain' | 'category', listType: 'blocklist' | 'greylist' | 'whitelist', manualCategory?: string) => void;
  removeSite: (id: string) => void;
  updateSiteName: (id: string, newName: string) => void;
  updateSiteCategory: (id: string, newCategory: string) => void;
  renameInnerDomain: (categoryKey: string, oldDomain: string, newDomain: string) => void;
  onMergeSites: (sourceId: string, targetId: string) => void;
  onMoveInnerDomain: (domain: string, fromCategory: string, targetId: string) => void;
  onRemoveFromCategory: (siteId: string, domain: string) => void;
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
  initialTab?: 'dashboard' | 'greylist' | 'whitelist' | 'analytics' | 'settings' | 'manual';
  onRequestOnboarding?: () => void;
}

type Tab = 'dashboard' | 'greylist' | 'whitelist' | 'analytics' | 'settings' | 'manual';
type BlockMode = 'url' | 'group';

const CATEGORY_OPTIONS = [
  { value: 'social', label: 'Social Media' },
  { value: 'news', label: 'News & Media' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'entertainment', label: 'Entertainment' },
];

const WEEKLY_DATA = {
  current: [
    { name: 'MON', value: 4 }, { name: 'TUE', value: 3 }, { name: 'WED', value: 8 },
    { name: 'THU', value: 2 }, { name: 'FRI', value: 6 }, { name: 'SAT', value: 1 }, { name: 'SUN', value: 2 }
  ],
  previous: [
    { name: 'MON', value: 5 }, { name: 'TUE', value: 6 }, { name: 'WED', value: 4 },
    { name: 'THU', value: 7 }, { name: 'FRI', value: 5 }, { name: 'SAT', value: 3 }, { name: 'SUN', value: 4 }
  ],
  older: [
    { name: 'MON', value: 2 }, { name: 'TUE', value: 4 }, { name: 'WED', value: 5 },
    { name: 'THU', value: 3 }, { name: 'FRI', value: 4 }, { name: 'SAT', value: 6 }, { name: 'SUN', value: 1 }
  ]
};

const FocusChartCard = React.memo(() => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [isWeekSelectorOpen, setIsWeekSelectorOpen] = useState(false);
  const [availableWeeks, setAvailableWeeks] = useState<Array<{ label: string; value: number }>>([]);
  const [chartData, setChartData] = useState<Array<{ name: string; value: number }>>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [trend, setTrend] = useState(0);

  // Load time data and generate week options
  useEffect(() => {
    const loadTimeData = async () => {
      const result = await chrome.storage.local.get('dailyTimeData');
      const dailyTimeData: Record<string, number> = result.dailyTimeData || {};
      
      // Get all dates and sort
      const dates = Object.keys(dailyTimeData).sort();
      if (dates.length === 0) {
        setChartData([
          { name: 'MON', value: 0 }, { name: 'TUE', value: 0 }, { name: 'WED', value: 0 },
          { name: 'THU', value: 0 }, { name: 'FRI', value: 0 }, { name: 'SAT', value: 0 }, { name: 'SUN', value: 0 }
        ]);
        setTotalHours(0);
        setTrend(0);
        setAvailableWeeks([{ label: 'CURRENT WEEK', value: 0 }]);
        return;
      }
      
      // Find the earliest date
      const earliestDate = new Date(dates[0]);
      const today = new Date();
      const daysSinceStart = Math.floor((today.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
      const weeksSinceStart = Math.floor(daysSinceStart / 7);
      
      // Generate week options (up to 12 weeks back or from app start)
      const weeks: Array<{ label: string; value: number }> = [];
      const maxWeeks = Math.min(12, weeksSinceStart + 1);
      for (let i = 0; i < maxWeeks; i++) {
        if (i === 0) {
          weeks.push({ label: 'CURRENT WEEK', value: 0 });
        } else if (i === 1) {
          weeks.push({ label: 'LAST WEEK', value: -1 });
        } else {
          weeks.push({ label: `${i} WEEKS AGO`, value: -i });
        }
      }
      setAvailableWeeks(weeks);
      
      // Calculate week data for selected offset
      const getWeekData = (offset: number) => {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (today.getDay() + offset * 7));
        weekStart.setHours(0, 0, 0, 0);
        
        const weekData: Array<{ name: string; value: number }> = [];
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        
        for (let i = 0; i < 7; i++) {
          const day = new Date(weekStart);
          day.setDate(weekStart.getDate() + (i === 0 ? 0 : i));
          const dateStr = day.toISOString().split('T')[0];
          const hours = dailyTimeData[dateStr] || 0;
          weekData.push({ name: dayNames[day.getDay()], value: Math.round(hours * 10) / 10 });
        }
        
        return weekData;
      };
      
      const currentWeekData = getWeekData(weekOffset);
      const previousWeekData = getWeekData(weekOffset - 1);
      
      setChartData(currentWeekData);
      const currentTotal = currentWeekData.reduce((acc, curr) => acc + curr.value, 0);
      const previousTotal = previousWeekData.reduce((acc, curr) => acc + curr.value, 0);
      setTotalHours(currentTotal);
      
      if (previousTotal > 0) {
        setTrend(((currentTotal - previousTotal) / previousTotal) * 100);
      } else {
        setTrend(0);
      }
    };
    
    loadTimeData();
    
    // Listen for time data changes
    const handleStorageChange = (changes: Record<string, { oldValue?: any; newValue?: any }>, areaName: string) => {
      if (changes.dailyTimeData && areaName === 'local') {
        loadTimeData();
      }
    };
    
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [weekOffset]);
  
  const isPositiveTrend = trend > 0;
  const selectedWeekLabel = availableWeeks.find(w => w.value === weekOffset)?.label || 'CURRENT WEEK';

  return (
    <div className="bg-white p-8 flex flex-col justify-between h-full min-h-[400px]">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12">
        <div>
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Time Distribution</h3>
            <div className="relative inline-block">
                <button 
                  onClick={() => setIsWeekSelectorOpen(!isWeekSelectorOpen)}
                  className="group flex items-center gap-3 text-3xl md:text-4xl font-bold tracking-tighter hover:text-zinc-600 transition-colors"
                >
                  {selectedWeekLabel}
                  <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${isWeekSelectorOpen ? 'rotate-180' : ''}`} />
                </button>
                {isWeekSelectorOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] z-20 max-h-96 overflow-y-auto">
                    {availableWeeks.map((week) => (
                      <button
                        key={week.value}
                        onClick={() => {
                          setWeekOffset(week.value);
                          setIsWeekSelectorOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest border-b last:border-0 border-zinc-100 hover:bg-zinc-100 transition-colors ${weekOffset === week.value ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'text-zinc-900'}`}
                      >
                        {week.label}
                      </button>
                    ))}
                  </div>
                )}
            </div>
        </div>
        <div className="text-right">
            <div className="text-4xl font-bold tracking-tighter">{totalHours}<span className="text-lg text-zinc-400 font-normal ml-1">hrs</span></div>
            {weekOffset < 0 && trend !== 0 && (
                <div className={`text-xs font-bold uppercase tracking-wide mt-1 flex items-center justify-end gap-1 ${isPositiveTrend ? 'text-zinc-900' : 'text-zinc-400'}`}>
                  {isPositiveTrend ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}
                  {Math.abs(trend).toFixed(0)}% vs prev
                </div>
            )}
        </div>
      </div>
      <div className="w-full" style={{ height: '192px', minHeight: '192px' }}>
        <ResponsiveContainer width="100%" height={192}>
          <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#000', fontSize: 10, fontFamily: 'Space Mono' }} dy={10} />
            <YAxis hide={false} axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 10, fontFamily: 'Space Mono' }} />
            <Tooltip 
              cursor={{ fill: '#f4f4f5' }}
              contentStyle={{ backgroundColor: '#000', color: '#fff', border: 'none', fontFamily: 'Space Mono', fontSize: '12px', padding: '8px 12px' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: number) => [`${value} hrs`, "Focused Hours"]}
              labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
            />
            <Bar dataKey="value" name="Focused Hours" maxBarSize={40}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === chartData.length - 1 && weekOffset === 0 ? '#18181b' : '#e4e4e7'} className="hover:opacity-80 transition-opacity cursor-pointer" />
              ))}
              <LabelList dataKey="value" position="top" style={{ fill: '#18181b', fontSize: '12px', fontFamily: 'Space Mono', fontWeight: 'bold' }} formatter={(value: number) => value > 0 ? value : ''} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

const Dashboard: React.FC<DashboardProps> = ({
  blockedSites,
  stats,
  metrics,
  categoryDefinitions,
  addSite,
  removeSite,
  updateSiteName,
  updateSiteCategory,
  renameInnerDomain,
  onMergeSites,
  onMoveInnerDomain,
  onRemoveFromCategory,
  settings,
  onUpdateSettings,
  initialTab,
  onRequestOnboarding
}) => {
  // Initialize active tab from hash (if present) or prop, falling back to dashboard
  const initialFromHash = (() => {
    if (typeof window !== 'undefined') {
      return hashToTab(window.location.hash) as Tab;
    }
    return (initialTab as Tab) || 'dashboard';
  })();
  const [activeTab, setActiveTab] = useState<Tab>(initialFromHash);
  const [blockMode, setBlockMode] = useState<BlockMode>('url');
  const [newDomain, setNewDomain] = useState('');
  const [groupCategory, setGroupCategory] = useState('social');
  const [urlCategoryOverride, setUrlCategoryOverride] = useState('auto');
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingField, setEditingField] = useState<'name' | 'category' | 'inner'>('name');
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [focusScore, setFocusScore] = useState<number>(metrics.focusScore || 0);
  
  // Initialize distinct quotes for each tab
  const [blacklistQuote] = useState(() => getRandomQuote());
  const [greylistQuote] = useState(() => getRandomQuote());
  
  const activeQuote = activeTab === 'greylist' ? greylistQuote : blacklistQuote;

  const isValidDomainInput = (input: string) => {
    try {
      const url = new URL(input.includes('://') ? input : `https://${input}`);
      const host = url.hostname.replace(/^www\./, '');
      return !!host && host.includes('.');
    } catch {
      return false;
    }
  };

  const handleAddRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const listType: 'blocklist' | 'greylist' | 'whitelist' =
      activeTab === 'greylist' ? 'greylist' :
      activeTab === 'whitelist' ? 'whitelist' : 'blocklist';
    const currentList = blockedSites.filter(s => s.listType === listType);
    if (blockMode === 'url') {
      const domainToAdd = newDomain.trim();
      if (!domainToAdd) return;
      if (!isValidDomainInput(domainToAdd)) {
        setFormError('Enter a valid domain (example.com)');
        return;
      }
      
      // Validation: Check if domain already exists in the current list
      const exists = currentList.some(s => s.type === 'domain' && s.domain.toLowerCase() === domainToAdd.toLowerCase());
      if (exists) {
          setFormError('Already in list');
          return;
      }
      const categoryToUse = urlCategoryOverride !== 'auto' ? urlCategoryOverride : undefined;
      addSite(domainToAdd, 'domain', listType, categoryToUse);
      setNewDomain('');
      setUrlCategoryOverride('auto');
    } else {
      // Validation: Check if category group already exists
      const exists = currentList.some(s => s.type === 'category' && s.category === groupCategory);
      if (exists) {
          setFormError('Group already active');
          return;
      }
      addSite(groupCategory, 'category', listType);
    }
  };

  const handleExportData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      stats: WEEKLY_DATA,
      metrics,
      blockedSites,
      categoryDefinitions,
      settings
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stoic-focus-data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleCategoryExpand = (id: string) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const startEditing = (id: string, currentName: string, field: 'name' | 'category' | 'inner') => {
    setEditingId(id);
    setEditValue(currentName);
    setEditingField(field);
  };

  const saveEditing = (id: string, extraData?: any) => {
    const trimmedVal = editValue.trim();
    
    // Check if value actually changed
    let originalValue = '';
    if (editingField === 'name') {
       const site = blockedSites.find(s => s.id === id);
       originalValue = site ? site.domain : '';
    } else if (editingField === 'category') {
       const site = blockedSites.find(s => s.id === id);
       originalValue = site ? site.category : '';
    } else if (editingField === 'inner') {
       originalValue = id; 
    }

    if (!trimmedVal || trimmedVal === originalValue) { 
        setEditingId(null); 
        return; 
    }

    let hasChanged = false;
    if (editingField === 'name') {
      const site = blockedSites.find(s => s.id === id);
      if (site && site.domain !== trimmedVal) hasChanged = true;
      if (hasChanged) updateSiteName(id, trimmedVal);
    } else if (editingField === 'category') {
      const site = blockedSites.find(s => s.id === id);
      if (site && site.category !== trimmedVal) hasChanged = true;
      if (hasChanged) updateSiteCategory(id, trimmedVal);
    } else if (editingField === 'inner' && extraData) {
      if (id !== trimmedVal) hasChanged = true;
      if (hasChanged) renameInnerDomain(extraData, id, trimmedVal);
    }

    setEditingId(null);
  };

  const handleDragStart = (e: React.DragEvent, id: string, type: 'site' | 'inner', extra?: any) => {
    const data = { type, id, ...extra };
    e.dataTransfer.setData('application/json', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); setDragOverId(id); };
  const handleDragLeave = () => { setDragOverId(null); };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault(); setDragOverId(null);
    try {
        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) return;
        const sourceData = JSON.parse(rawData);
        if (sourceData.id === targetId) return;
        if (sourceData.type === 'site') { onMergeSites(sourceData.id, targetId); } 
        else if (sourceData.type === 'inner') { onMoveInnerDomain(sourceData.domain, sourceData.parentCategory, targetId); }
    } catch (err) { console.error("Drop Error", err); }
  };

  const domainBlockStats = useMemo(
    () => computeDomainBlockStats(blockedSites, categoryDefinitions),
    [blockedSites, categoryDefinitions]
  );

  const COLORS = ['#18181b', '#52525b', '#a1a1aa', '#e4e4e7', '#d4d4d8', '#f5f5f5'];

  // Compute focus score based on last 7 days focused hours vs a 14h weekly goal (2h/day)
  useEffect(() => {
    const computeScore = (daily: Record<string, number>) => {
      const dates = Object.keys(daily).sort();
      const today = new Date();
      const last7 = dates.filter((d) => {
        const diff = (today.getTime() - new Date(d).getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 6; // include today and past 6 days
      });
      const hours = last7.reduce((acc, d) => acc + (daily[d] || 0), 0);
      const goalHours = 14; // 2h/day over 7 days
      const score = Math.max(0, Math.min(100, Math.round((hours / goalHours) * 100)));
      setFocusScore(score);
    };

    const load = async () => {
      try {
        const res = await chrome.storage.local.get('dailyTimeData');
        computeScore(res.dailyTimeData || {});
      } catch {
        // ignore
      }
    };
    load();

    const handleChange = (changes: Record<string, { oldValue?: any; newValue?: any }>, area: string) => {
      if (area === 'local' && changes.dailyTimeData) {
        computeScore(changes.dailyTimeData.newValue || {});
      }
    };
    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }, []);

  // Update hash when tab changes
  useEffect(() => {
    const hash = tabToHash(activeTab as any);
    if (typeof window !== 'undefined' && window.location.hash !== hash) {
      window.location.hash = hash;
    }
  }, [activeTab]);

  // Respond to hash changes (navigation / reload)
  useEffect(() => {
    const handleHashChange = () => {
      const next = hashToTab(window.location.hash) as Tab;
      setActiveTab(next);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
    return () => {};
  }, []);

  const NavItem = ({ tab, label, icon: Icon }: { tab: Tab, label: string, icon: any }) => (
    <button onClick={() => setActiveTab(tab)} className={`w-full flex items-center justify-between px-4 py-3 border-b border-zinc-900 transition-all duration-200 group ${activeTab === tab ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900 hover:bg-zinc-100'}`}>
      <div className="flex items-center gap-3"><Icon className="w-4 h-4 font-mono" /><span className="font-mono text-xs uppercase tracking-widest">{label}</span></div>
      {activeTab === tab && <ArrowRight className="w-4 h-4" />}
    </button>
  );

const renderListTable = (type: 'blocklist' | 'greylist' | 'whitelist') => {
    const sites = blockedSites.filter(s => s.listType === type || (type === 'blocklist' && s.listType === 'blacklist'));

    return (
      <div className="border-2 border-zinc-900 bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-zinc-900 bg-zinc-100">
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-1/2">Target</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Type</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Category</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {sites.map((site) => {
                const isExpanded = expandedCategories[site.id];
                const includedDomains = site.type === 'category' ? categoryDefinitions[site.category] || [] : [];
                const otherListType = type === 'blocklist' ? 'greylist' : 'blocklist';
                const isConflict = hasSiteConflicts(site, type, blockedSites, categoryDefinitions);
                const categoryHasDuplicates = site.type === 'category' ? categoryHasConflicts(site.category, type, blockedSites, categoryDefinitions) : false;

  return (
                <React.Fragment key={site.id}>
                  <tr draggable="true" onDragStart={(e) => handleDragStart(e, site.id, 'site')} onDragOver={(e) => handleDragOver(e, site.id)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, site.id)} className={`group hover:bg-zinc-50 transition-colors ${dragOverId === site.id ? 'bg-zinc-100 ring-2 ring-inset ring-zinc-900' : ''}`}>
                    <td className="px-6 py-5 align-top">
                      <div className="flex items-center gap-3 font-bold text-sm">
                          {site.type === 'category' ? (
                              <button onClick={() => toggleCategoryExpand(site.id)} className="text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer flex items-center justify-center w-6 h-6 hover:bg-zinc-200 rounded-sm">
                                  <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                          ) : <div className="w-6"/>}
                          <div className={`cursor-grab active:cursor-grabbing ${site.type === 'category' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-900'}`}>
                              {site.type === 'category' ? <Folder className="w-4 h-4" /> : <Globe className="w-4 h-4"/>}
                          </div>
                          {editingId === site.id && editingField === 'name' ? (
                            <div className="flex items-center gap-2 flex-1"><input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="border-none p-0 focus:outline-none focus:ring-0 bg-transparent uppercase font-bold text-sm w-full leading-none" autoFocus onBlur={() => saveEditing(site.id)} onKeyDown={(e) => e.key === 'Enter' && saveEditing(site.id)}/><button onMouseDown={(e) => e.preventDefault()} onClick={() => saveEditing(site.id)} className="text-zinc-900 hover:text-emerald-600"><Check className="w-4 h-4" /></button></div>
                          ) : (
                            <div className="flex items-center gap-2 group/edit" onDoubleClick={() => startEditing(site.id, site.domain, 'name')}>
                              <span className="uppercase tracking-tight cursor-text hover:underline decoration-zinc-400/50 underline-offset-4 truncate max-w-[200px]" title={site.domain}>{site.domain}</span>
                              <button onClick={() => startEditing(site.id, site.domain, 'name')} className="opacity-0 group-hover/edit:opacity-100 text-zinc-400 hover:text-zinc-900 transition-opacity"><Pencil className="w-3 h-3" /></button>
                              {site.type === 'category' && !isExpanded && includedDomains.length > 0 && <span className="text-[10px] text-zinc-400 font-normal">({includedDomains.length} items)</span>}
                          {site.type === 'category' && (categoryHasDuplicates || isConflict) && (
                                <AlertCircle className="w-3 h-3 text-red-500" title="This category contains domains that exist in other lists" />
                              )}
                          {site.type === 'domain' && (() => {
                            const conflicts = getDomainConflicts(site.domain, type, blockedSites, categoryDefinitions);
                            const msg = buildConflictMessage(type, conflicts);
                            return conflicts.length > 0 ? (
                              <div className="flex items-center gap-1 text-red-500" title={msg}>
                                <AlertCircle className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-tight">{msg}</span>
                              </div>
                            ) : null;
                          })()}
                            </div>
                          )}
        </div>
                    </td>
                    <td className="px-6 py-5 align-top"><span className="inline-block border border-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">{site.type}</span></td>
                    <td className="px-6 py-5 align-top relative">
                      <div className="flex items-center gap-2">
                        {editingId === site.id && editingField === 'category' ? (
                            <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="border-none p-0 focus:outline-none focus:ring-0 bg-transparent font-mono text-xs uppercase w-full absolute inset-0 px-6 py-5 leading-none" autoFocus onBlur={() => saveEditing(site.id)} onKeyDown={(e) => e.key === 'Enter' && saveEditing(site.id)}/>
                        ) : (
                            <span onDoubleClick={() => startEditing(site.id, site.category, 'category')} className="text-xs font-mono text-zinc-600 uppercase cursor-text hover:underline decoration-zinc-400/50 underline-offset-4 block w-full truncate max-w-[160px]" title={site.category}>{site.category}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right align-top"><button onClick={() => removeSite(site.id)} className="text-zinc-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4 ml-auto" /></button></td>
                  </tr>
                  {isExpanded && includedDomains.map((domain, index) => {
                      const innerKey = `inner-${site.category}-${domain}`;
                      const isEditingInner = editingId === innerKey;
                      const domainConflicts = getDomainConflicts(domain, type, blockedSites, categoryDefinitions);
                      const domainMessage = buildConflictMessage(type, domainConflicts);
                      return (
                          <tr key={innerKey} draggable="true" onDragStart={(e) => handleDragStart(e, domain, 'inner', { domain, parentCategory: site.category })} className="bg-zinc-50 group/item hover:bg-zinc-100 transition-colors">
                              <td className="px-6 py-2 align-middle">
                                <div className="flex items-center gap-3 pl-12">
                                  <CornerDownRight className="w-3 h-3 text-zinc-300" />
                                  <GripVertical className="w-3 h-3 text-zinc-300 cursor-grab active:cursor-grabbing opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                  {isEditingInner ? (
                                    <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="border-none p-0 focus:outline-none focus:ring-0 bg-transparent font-mono text-[10px] uppercase font-bold w-48 leading-none" autoFocus onBlur={() => saveEditing(domain, site.category)} onKeyDown={(e) => e.key === 'Enter' && saveEditing(domain, site.category)} />
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span onDoubleClick={() => startEditing(innerKey, domain, 'inner')} className="text-[10px] font-mono font-bold text-zinc-600 cursor-text hover:underline decoration-zinc-300 truncate max-w-[260px]" title={domain}>{domain}</span>
                                      {domainConflicts.length > 0 && (
                                        <div className="flex items-center gap-1 text-red-500" title={domainMessage}>
                                          <AlertCircle className="w-3 h-3" />
                                          <span className="text-[10px] font-bold uppercase tracking-tight">{domainMessage}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-2 align-middle"><span className="text-[10px] text-zinc-400 font-mono uppercase">DOMAIN</span></td>
                              <td className="px-6 py-2 align-middle">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-zinc-300 font-mono uppercase">{site.category}</span>
                                </div>
                              </td>
                              <td className="px-6 py-2 align-middle text-right"><button onClick={() => onRemoveFromCategory(site.id, domain)} className="text-zinc-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"><X className="w-3 h-3 ml-auto" /></button></td>
                          </tr>
                      );
                  })}
                </React.Fragment>
                );
            })}
            {sites.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-400 font-mono text-sm uppercase tracking-widest">No active boundaries set.</td></tr>}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAddForm = (listType: 'blocklist' | 'greylist' | 'whitelist') => (
    <form onSubmit={handleAddRequest} className="flex flex-col md:flex-row w-full md:items-center gap-4">
      <div className="flex flex-col md:flex-row border-2 border-zinc-900 bg-white w-full md:w-[480px]">
        <div className="relative border-b-2 md:border-b-0 md:border-r-2 border-zinc-900 bg-zinc-50 w-full md:w-[100px] shrink-0">
            <select value={blockMode} onChange={(e) => { setBlockMode(e.target.value as BlockMode); setFormError(null); }} className="w-full h-full px-3 py-2 text-xs font-bold uppercase focus:outline-none appearance-none cursor-pointer hover:bg-zinc-100 transition-colors pr-6">
              <option value="url">URL</option><option value="group">Category</option>
            </select>
            <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                </div>
        <div className="flex-1 flex min-w-0">
          {blockMode === 'url' && (
            <><input type="text" value={newDomain} onChange={(e) => { setNewDomain(e.target.value); setFormError(null); }} placeholder="DOMAIN.COM" className="flex-1 w-0 px-4 py-2 text-sm focus:outline-none font-mono uppercase placeholder:normal-case border-b-2 md:border-b-0 md:border-r-2 border-zinc-900" />
            <div className="relative w-[110px] shrink-0 hidden sm:block">
              <select value={urlCategoryOverride} onChange={(e) => setUrlCategoryOverride(e.target.value)} className="w-full h-full px-2 py-2 text-[10px] focus:outline-none cursor-pointer font-mono uppercase bg-white appearance-none pr-6 text-zinc-500 font-bold"><option value="auto">Auto</option>{CATEGORY_OPTIONS.map(opt => <option key={opt.value} value={opt.value} className="text-zinc-900">{opt.label}</option>)}</select>
              <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
            </div></>
          )}
          {blockMode === 'group' && (
            <div className="relative w-full h-full">
                <select value={groupCategory} onChange={(e) => { setGroupCategory(e.target.value); setFormError(null); }} className="w-full h-full px-4 py-2 text-sm focus:outline-none cursor-pointer font-mono uppercase bg-white appearance-none pr-8 font-bold">{CATEGORY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
            </div>
          )}
        </div>
        <button type="submit" className="bg-zinc-900 text-white hover:bg-zinc-700 transition-colors flex items-center justify-center border-l-2 border-zinc-900 w-full md:w-[50px] shrink-0 h-10 md:h-auto"><Plus className="w-4 h-4" /></button>
      </div>
      {formError && (
          <div className="flex items-center gap-2 text-red-500 animate-in fade-in slide-in-from-left-2">
             <AlertCircle className="w-4 h-4" />
             <span className="text-xs font-bold uppercase tracking-wide">{formError}</span>
          </div>
        )}
    </form>
  );

  return (
    <div className="h-full bg-white text-zinc-900 flex font-mono selection:bg-zinc-900 selection:text-white overflow-hidden">
      <aside className="w-72 border-r border-zinc-900 flex flex-col hidden md:flex h-screen bg-white z-10 fixed left-0 top-0">
        <div className="h-20 border-b border-zinc-900 flex items-center px-6 gap-3 shrink-0"><div className="w-6 h-6 bg-zinc-900"></div><h1 className="text-lg font-bold tracking-tighter uppercase">StoicFocus</h1></div>
        
        <nav className="flex-1 overflow-y-auto min-h-0">
          <NavItem tab="dashboard" label="Blocklist" icon={Ban} />
          <NavItem tab="greylist" label="Grey List" icon={Feather} />
          <NavItem tab="whitelist" label="Whitelist" icon={Square} />
          <NavItem tab="analytics" label="Analytics" icon={BarChart3} />
        </nav>
        
        <div className="mt-auto shrink-0 border-t border-zinc-900">
          <NavItem tab="manual" label="Manual" icon={BookOpen} />
          <NavItem tab="settings" label="Config" icon={SettingsIcon} />
        </div>
        
        <div className="p-6 border-t border-zinc-900 shrink-0">
           <div className="flex items-center justify-between mb-2"><span className="text-[10px] uppercase tracking-widest text-zinc-500">System Status</span><div className={`w-2 h-2 rounded-full ${settings.enabled ? 'bg-emerald-500' : 'bg-red-500'}`}></div></div>
           <div className="font-bold text-xs uppercase">{settings.enabled ? 'Protection Active' : 'System Disabled'}</div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto h-full bg-white ml-72">
        <div className="max-w-6xl mx-auto p-8 lg:p-12 pb-24">
          
          {(activeTab === 'dashboard' || activeTab === 'greylist' || activeTab === 'whitelist') && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
              <header className="pb-2">
                 <span className="inline-block px-2 py-1 bg-zinc-900 text-white text-[10px] uppercase tracking-widest mb-6">Daily Wisdom</span>
                 <h2 className="text-lg md:text-xl lg:text-2xl font-serif italic leading-tight max-w-4xl">"{activeQuote.text}"</h2>
                 <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mt-4">— {activeQuote.author}</p>
              </header>
              <section className="space-y-6">
                <div className="mb-6">
                     <h3 className="text-2xl font-bold tracking-tight mb-1">
                       {activeTab === 'dashboard' ? 'Restricted Territories' : activeTab === 'greylist' ? 'Friction Zone' : 'Safe Passage'}
                     </h3>
                     <p className="text-xs text-zinc-500 uppercase tracking-widest">
                       {activeTab === 'dashboard' ? 'Manage your digital boundaries' :
                        activeTab === 'greylist' ? 'Typing Tax applied to these sites' :
                        'No limits apply to these domains'}
                     </p>
                </div>
                {renderAddForm(activeTab === 'dashboard' ? 'blocklist' : activeTab === 'greylist' ? 'greylist' : 'whitelist')}
                {renderListTable(activeTab === 'dashboard' ? 'blocklist' : activeTab === 'greylist' ? 'greylist' : 'whitelist')}
              </section>
          </div>
        )}

        {activeTab === 'analytics' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
               <header className="pb-2 mb-6"><div className="flex items-center gap-2 mb-4"><div className="w-4 h-4 bg-zinc-900"></div><h2 className="text-sm font-bold uppercase tracking-widest">Deep Metrics</h2></div><p className="text-lg md:text-xl lg:text-2xl font-serif italic leading-tight text-zinc-900 max-w-4xl">"Time is the most valuable thing a man can spend."</p><p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mt-4">— Diogenes</p></header>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-2 border-zinc-900 bg-zinc-900">
                 {/* Chart - Full Width */}
                 <div className="md:col-span-2 lg:col-span-4 border-b-2 border-zinc-900"><FocusChartCard /></div>
                 
                 {/* Stats Cards */}
                 <div className="bg-white p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-zinc-900 flex flex-col justify-center min-h-[160px]">
                    <div className="flex items-center gap-2 mb-4 text-zinc-400"><Lock className="w-4 h-4" /><span className="text-[10px] uppercase tracking-widest font-bold">Interventions</span></div>
                    <p className="text-5xl font-bold tracking-tighter">{metrics.interventions}</p>
                 </div>
                 
                 <div className="bg-white p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-zinc-900 flex flex-col justify-center min-h-[160px]">
                    <div className="flex items-center gap-2 mb-4 text-zinc-400"><Layers className="w-4 h-4" /><span className="text-[10px] uppercase tracking-widest font-bold">Tabs Withered</span></div>
                    <p className="text-5xl font-bold tracking-tighter">{metrics.tabsWithered}</p>
                 </div>
                 <div className="bg-white p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-zinc-900 flex flex-col justify-center min-h-[160px]">
                    <div className="flex items-center gap-2 mb-4 text-zinc-400"><Feather className="w-4 h-4" /><span className="text-[10px] uppercase tracking-widest font-bold">Friction Overcome</span></div>
                    <p className="text-5xl font-bold tracking-tighter">{metrics.frictionOvercome}</p>
                 </div>
                 <div className="bg-zinc-900 text-white p-8 flex flex-col justify-center relative overflow-hidden group min-h-[160px]" title="Focus Score = (Focused hours over last 7 days) / 14h goal (2h/day), capped at 100%">
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-2 mb-4 text-zinc-400 relative z-10"><CheckCircle2 className="w-4 h-4" /><span className="text-[10px] uppercase tracking-widest font-bold">Focus Score</span></div>
                    <p className="text-5xl font-bold tracking-tighter relative z-10">{focusScore}%</p>
                 </div>
                 
                 {/* Deep Details */}
                 <div className="bg-white p-8 border-t-2 lg:border-r-2 border-zinc-900 min-h-[300px] col-span-1 md:col-span-2">
                   <h3 className="text-[10px] font-bold text-zinc-400 mb-8 uppercase tracking-widest">Distraction Profile</h3>
                   <div className="w-full flex items-center justify-center" style={{ height: '256px', minHeight: '256px' }}>
                     <ResponsiveContainer width="100%" height={256}>
                       <PieChart>
                         <Pie
                           data={domainBlockStats.length > 0 ? domainBlockStats.slice(0, 8) : [{ domain: 'No data', count: 1 }]}
                           dataKey="count"
                           nameKey="domain"
                           cx="50%"
                           cy="50%"
                           innerRadius={60}
                           outerRadius={85}
                           paddingAngle={2}
                         >
                           {(domainBlockStats.length > 0 ? domainBlockStats.slice(0, 8) : [{ domain: 'No data', count: 1 }]).map((entry, index) => (
                             <Cell key={`cell-${entry.domain}-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                           ))}
                         </Pie>
                         <Tooltip
                           cursor={false}
                           contentStyle={{ backgroundColor: '#000', color: '#fff', border: 'none', fontFamily: 'Space Mono', fontSize: '12px' }}
                           itemStyle={{ color: '#fff' }}
                           formatter={(value: number, name: string) => [`${value} blocks`, name]}
                         />
                         <Legend
                           layout="vertical"
                           verticalAlign="middle"
                           align="right"
                           wrapperStyle={{ fontFamily: 'Space Mono', fontSize: '10px', textTransform: 'uppercase' }}
                         />
                       </PieChart>
                     </ResponsiveContainer>
                   </div>
                 </div>
                 <div className="bg-zinc-50 p-8 border-t-2 border-zinc-900 flex flex-col justify-center items-center text-center min-h-[300px] col-span-1 md:col-span-2">
                   <p className="text-zinc-400 text-xs font-mono mb-4 uppercase">Most Frequent Block</p>
                   {domainBlockStats.length > 0 && domainBlockStats[0].count > 0 ? (
                     <>
                       <p className="text-3xl font-bold uppercase tracking-tight truncate max-w-[320px]" title={domainBlockStats[0].domain}>{domainBlockStats[0].domain}</p>
                       <p className="text-zinc-900 text-sm font-bold mt-2">{domainBlockStats[0].count} Attempts</p>
                     </>
                   ) : (
                     <p className="text-sm text-zinc-300 font-mono uppercase">Insufficient Data</p>
                   )}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
               <header className="pb-2 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-start gap-3">
                  <div>
                    <h2 className="text-4xl font-bold uppercase tracking-tighter mb-2">Manual</h2>
                    <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Understanding the mechanism.</p>
                  </div>
                </div>
              </header>
              <div className="border-2 border-zinc-900 bg-white divide-y-2 divide-zinc-900">
                 {[
                   { title: "Blocklist (Strict Block)", desc: "The Iron Curtain. Sites added here are absolutely restricted during focus sessions. Any attempt to access them will result in an immediate redirect to a screen of Stoic wisdom.", icon: Ban },
                   { title: "Grey List (Friction Zone)", desc: "A middle ground for necessary evils. Sites here aren't blocked outright but require a 'Typing Tax'. To access them, you must perfectly type a difficult philosophical text, proving your intent is conscious, not impulsive.", icon: Feather },
                   { title: "Whitelist (Safe Passage)", desc: "Trusted domains. StoicFocus will not apply friction, monochrome, doom-scroll, or blocking to these sites.", icon: Square },
                   { title: "Memento Mori Tabs", desc: "Tabs are transient. If you exceed your limit (Default: 5), the oldest tab is automatically closed. Pinned tabs are safe.", icon: Layers },
                   { title: "Monochrome Mode", desc: "Dopamine detox. During focus sessions, the entire internet is rendered in grayscale to reduce visual stimulation.", icon: EyeOff },
                   { title: "Hardcore Focus", desc: "To pause or disable protection, you must solve a chess puzzle. Incorrect answers lock you in.", icon: Zap },
                   { title: "In-Page Blocker", desc: "A floating 'BLOCK SITE' button appears on every webpage, allowing for immediate boundary setting without opening the dashboard.", icon: MousePointerClick },
                   { title: "Time Boxing", desc: "Customize your rhythm. Configure specific durations for Deep Work cycles and Rest phases to match your personal productivity flow.", icon: Clock },
                   { title: "AI Wisdom", desc: "Optional Google Gemini integration generates context-aware Stoic quotes based specifically on the site you are trying to visit.", icon: Sparkles },
                   { title: "Negative Visualization", desc: "Before every session, you must visualize why you might fail. If you visit a restricted site, your own prediction is shown back to you.", icon: EyeOff },
                   { title: "Focus Score", desc: "Shows how much focused time you logged in the last 7 days versus a 14h goal (2h/day).", icon: CheckCircle2 },
                 ].map((feature, i) => (
                   <div key={i} className="p-8 flex gap-6">
                      <div className="w-12 h-12 border-2 border-zinc-900 flex items-center justify-center shrink-0"><feature.icon className="w-6 h-6" /></div>
                      <div><h3 className="text-lg font-bold uppercase mb-2">{feature.title}</h3><p className="text-sm text-zinc-600 leading-relaxed max-w-2xl">{feature.desc}</p></div>
              </div>
                 ))}
              </div>
              {/* BUY ME A COFFEE CTA */}
              <div className="mt-12 p-8 border-2 border-zinc-900 bg-zinc-50 flex flex-col items-center text-center">
                  <Coffee className="w-8 h-8 mb-4 text-zinc-900" />
                  <h3 className="text-xl font-bold uppercase tracking-tight mb-2">Fuel the Architecture</h3>
                  <p className="text-sm font-mono text-zinc-600 mb-6 max-w-lg">
                      This tool is free, but focus is priceless. If StoicFocus helps you reclaim your time, consider supporting its development.
                  </p>
                  <a 
                      href="https://www.buymeacoffee.com/" 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-8 py-3 bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors flex items-center gap-2"
                  >
                      Buy Me A Coffee <ArrowRight className="w-4 h-4" />
                  </a>
              </div>
              <div className="mt-12 mb-4 flex justify-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Crafted with focus by <a href="https://ralabs.org/" target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-zinc-900 transition-colors underline decoration-zinc-300 underline-offset-4">ralabs.org</a>
                  </p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <header className="pb-2 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div><h2 className="text-4xl font-bold uppercase tracking-tighter mb-2">System Config</h2><p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Calibrate your environment.</p></div>
                <button onClick={handleExportData} className="flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-widest transition-colors"><Download className="w-4 h-4" />Export JSON</button>
              </header>
              <div className="border-2 border-zinc-900 bg-white">
                  {/* EXISTING SETTINGS */}
                  <div className="p-8 border-b border-zinc-200 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-6"><div className="w-12 h-12 border-2 border-zinc-900 flex items-center justify-center text-zinc-900"><Power className="w-6 h-6" /></div><div><p className="text-lg font-bold uppercase tracking-tight">System Status</p><p className="text-xs text-zinc-500 font-mono uppercase mt-1">Global Killswitch</p></div></div>
                      <button onClick={() => onUpdateSettings({...settings, enabled: !settings.enabled})} className={`w-14 h-8 p-1 transition-colors duration-200 ease-linear border-2 border-zinc-900 ${settings.enabled ? 'bg-zinc-900' : 'bg-white'}`}><div className={`w-5 h-5 bg-white border border-zinc-900 shadow-sm transform transition-transform duration-200 ${settings.enabled ? 'translate-x-6 bg-white' : 'translate-x-0 bg-zinc-900'}`} /></button>
                  </div>
                  <div className="p-8 border-b border-zinc-200 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-6"><div className="w-12 h-12 border-2 border-zinc-900 flex items-center justify-center text-zinc-900"><Zap className="w-6 h-6" /></div><div><p className="text-lg font-bold uppercase tracking-tight">Hardcore Focus</p><p className="text-xs text-zinc-500 font-mono uppercase mt-1">Force puzzle on disable</p></div></div>
                      <button onClick={() => onUpdateSettings({...settings, hardcoreMode: !settings.hardcoreMode})} className={`w-14 h-8 p-1 transition-colors duration-200 ease-linear border-2 border-zinc-900 ${settings.hardcoreMode ? 'bg-zinc-900' : 'bg-white'}`}><div className={`w-5 h-5 bg-white border border-zinc-900 shadow-sm transform transition-transform duration-200 ${settings.hardcoreMode ? 'translate-x-6' : 'translate-x-0 bg-zinc-900'}`} /></button>
                  </div>
                  <div className="p-8 border-b border-zinc-200 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-6"><div className="w-12 h-12 border-2 border-zinc-900 flex items-center justify-center text-zinc-900"><MousePointerClick className="w-6 h-6" /></div><div><p className="text-lg font-bold uppercase tracking-tight">In-Page Blocker</p><p className="text-xs text-zinc-500 font-mono uppercase mt-1">Show 'Block Site' button & Doom Scroll</p></div></div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1">Doom Limit (Pages)</label>
                            <input type="number" min="1" max="100" value={settings.doomScrollLimit} onChange={(e) => onUpdateSettings({...settings, doomScrollLimit: Math.max(1, parseInt(e.target.value) || 3)})} className="w-20 h-10 border-2 border-zinc-900 p-2 font-mono text-center text-lg font-bold focus:outline-none" />
                            <span className="text-[10px] text-zinc-400 font-mono mt-1">Number of screen-heights scrolled before alert.</span>
                        </div>
                        <button onClick={() => onUpdateSettings({...settings, showInjectedIcon: !settings.showInjectedIcon})} className={`w-14 h-8 p-1 transition-colors duration-200 ease-linear border-2 border-zinc-900 ${settings.showInjectedIcon ? 'bg-zinc-900' : 'bg-white'}`}><div className={`w-5 h-5 bg-white border border-zinc-900 shadow-sm transform transition-transform duration-200 ${settings.showInjectedIcon ? 'translate-x-6' : 'translate-x-0 bg-zinc-900'}`} /></button>
                      </div>
                  </div>
                  
                  {/* NEW SETTINGS */}
                   <div className="p-8 border-b border-zinc-200 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-6"><div className="w-12 h-12 border-2 border-zinc-900 flex items-center justify-center text-zinc-900"><EyeOff className="w-6 h-6" /></div><div><p className="text-lg font-bold uppercase tracking-tight">Negative Visualization</p><p className="text-xs text-zinc-500 font-mono uppercase mt-1">Pre-mortem check before focus</p></div></div>
                      <button onClick={() => onUpdateSettings({...settings, negativeVisualization: !settings.negativeVisualization})} className={`w-14 h-8 p-1 transition-colors duration-200 ease-linear border-2 border-zinc-900 ${settings.negativeVisualization ? 'bg-zinc-900' : 'bg-white'}`}><div className={`w-5 h-5 bg-white border border-zinc-900 shadow-sm transform transition-transform duration-200 ${settings.negativeVisualization ? 'translate-x-6' : 'translate-x-0 bg-zinc-900'}`} /></button>
                  </div>
                  <div className="p-8 border-b border-zinc-200 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-6"><div className="w-12 h-12 border-2 border-zinc-900 flex items-center justify-center text-zinc-900"><EyeOff className="w-6 h-6" /></div><div><p className="text-lg font-bold uppercase tracking-tight">Monochrome Internet</p><p className="text-xs text-zinc-500 font-mono uppercase mt-1">Grayscale filter on all sites</p></div></div>
                      <button onClick={() => onUpdateSettings({...settings, monochromeMode: !settings.monochromeMode})} className={`w-14 h-8 p-1 transition-colors duration-200 ease-linear border-2 border-zinc-900 ${settings.monochromeMode ? 'bg-zinc-900' : 'bg-white'}`}><div className={`w-5 h-5 bg-white border border-zinc-900 shadow-sm transform transition-transform duration-200 ${settings.monochromeMode ? 'translate-x-6' : 'translate-x-0 bg-zinc-900'}`} /></button>
                  </div>
                   
                   <div className="p-8 border-b border-zinc-200 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-6"><div className="w-12 h-12 border-2 border-zinc-900 flex items-center justify-center text-zinc-900"><Layers className="w-6 h-6" /></div><div><p className="text-lg font-bold uppercase tracking-tight">Memento Mori Tabs</p><p className="text-xs text-zinc-500 font-mono uppercase mt-1">Auto-close old tabs</p></div></div>
                      <div className="flex items-center gap-4">
                        <button onClick={() => onUpdateSettings({...settings, mementoMoriEnabled: !settings.mementoMoriEnabled})} className={`w-14 h-8 p-1 transition-colors duration-200 ease-linear border-2 border-zinc-900 ${settings.mementoMoriEnabled ? 'bg-zinc-900' : 'bg-white'}`}><div className={`w-5 h-5 bg-white border border-zinc-900 shadow-sm transform transition-transform duration-200 ${settings.mementoMoriEnabled ? 'translate-x-6' : 'translate-x-0 bg-zinc-900'}`} /></button>
                        {settings.mementoMoriEnabled && (
                            <input type="number" min="1" max="50" value={settings.tabLimit} onChange={(e) => onUpdateSettings({...settings, tabLimit: Math.max(1, parseInt(e.target.value) || 1)})} className="w-20 h-10 border-2 border-zinc-900 p-2 font-mono text-center text-lg font-bold focus:outline-none" />
                        )}
                      </div>
                   </div>
                  <div className="p-8 border-b border-zinc-200 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-6"><div className="w-12 h-12 border-2 border-zinc-900 flex items-center justify-center text-zinc-900"><Clock className="w-6 h-6" /></div><div><p className="text-lg font-bold uppercase tracking-tight">Time Boxing</p><p className="text-xs text-zinc-500 font-mono uppercase mt-1">Deep Work & Rest Durations</p></div></div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1">Focus (Min)</label>
                            <input type="number" min="1" max="120" value={settings.focusDuration} onChange={(e) => onUpdateSettings({...settings, focusDuration: Math.max(1, parseInt(e.target.value) || 25)})} className="w-20 h-10 border-2 border-zinc-900 p-2 font-mono text-center text-lg font-bold focus:outline-none" />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1">Break (Min)</label>
                            <input type="number" min="1" max="60" value={settings.breakDuration} onChange={(e) => onUpdateSettings({...settings, breakDuration: Math.max(1, parseInt(e.target.value) || 5)})} className="w-20 h-10 border-2 border-zinc-900 p-2 font-mono text-center text-lg font-bold focus:outline-none" />
                        </div>
                      </div>
                   </div>
                   {/* AI CONFIG */}
                   <div className="p-8 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-6"><div className="w-12 h-12 border-2 border-zinc-900 flex items-center justify-center text-zinc-900"><Sparkles className="w-6 h-6" /></div><div><p className="text-lg font-bold uppercase tracking-tight">Gemini Integration</p><p className="text-xs text-zinc-500 font-mono uppercase mt-1">Context-aware Stoic quotes (Optional)</p></div></div>
                <input
                        type="password" 
                        placeholder="PASTE API KEY" 
                        value={settings.geminiApiKey || ''} 
                        onChange={(e) => onUpdateSettings({...settings, geminiApiKey: e.target.value})} 
                        className="w-64 h-10 border-2 border-zinc-900 p-2 font-mono text-xs focus:outline-none" 
                      />
            </div>
            </div>
          </div>
        )}

      </div>
      <button
        onClick={() => onRequestOnboarding && onRequestOnboarding()}
        title="Open Help"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-zinc-900 text-white text-2xl font-bold shadow-[0_8px_24px_rgba(0,0,0,0.2)] hover:bg-zinc-700 transition-colors z-50 flex items-center justify-center"
      >
        ?
      </button>
      </main>
    </div>
  );
};

export default Dashboard;
