"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  LayoutDashboard,
  Coins,
  ShieldCheck,
  LineChart,
  CalendarDays,
  Bell,
  User,
  ArrowRight,
  TrendingUp,
  Lock,
  Unlock,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Info,
  Clock,
  LogOut,
  PlusCircle,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Filter,
  Download,
  Terminal,
  Activity,
  History,
  Compass,
  FileCode,
  Flame,
  MousePointerClick
} from "lucide-react";
import { useVesting } from "@/context/VestingContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";

export default function Home() {
  const { isConnected, address } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const {
    schedules,
    logs,
    notifications,
    isDemoMode,
    setIsDemoMode,
    activeTab,
    setActiveTab,
    viewingScheduleId,
    setViewingScheduleId,
    walletHealthScore,
    riskIndicator,
    createSchedule,
    claimTokens,
    claimAllTokens,
    revokeSchedule,
    emergencyWithdraw,
    markAllNotificationsRead,
    exportData,
  } = useVesting();

  // SSR Hydration fix
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Mouse Reactive Gradients
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Command Palette Ctrl+K state
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
      if (e.key === "Escape") {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Quick calculations for dashboard stats
  const totalLockedUSD = schedules
    .filter((s) => !s.revoked)
    .reduce((acc, curr) => acc + (curr.amountTotal - curr.released) * curr.usdRate, 0);

  const totalVestedUSD = schedules
    .filter((s) => !s.revoked)
    .reduce((acc, curr) => {
      const time = Math.floor(Date.now() / 1000);
      let vested = 0;
      if (time >= curr.cliff) {
        if (time >= curr.start + curr.duration) {
          vested = curr.amountTotal;
        } else {
          vested = Math.floor((curr.amountTotal * (time - curr.start)) / curr.duration);
        }
      }
      return acc + vested * curr.usdRate;
    }, 0);

  const totalClaimedUSD = schedules.reduce((acc, curr) => acc + curr.released * curr.usdRate, 0);

  const claimableUSD = schedules
    .filter((s) => !s.revoked)
    .reduce((acc, curr) => {
      const time = Math.floor(Date.now() / 1000);
      let vested = 0;
      if (time >= curr.cliff) {
        if (time >= curr.start + curr.duration) {
          vested = curr.amountTotal;
        } else {
          vested = Math.floor((curr.amountTotal * (time - curr.start)) / curr.duration);
        }
      }
      const releasable = Math.max(0, vested - curr.released);
      return acc + releasable * curr.usdRate;
    }, 0);

  // Search/Filter Schedules
  const [scheduleSearch, setScheduleSearch] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState("all"); // all, active, completed, revoked
  
  const filteredSchedules = schedules.filter((s) => {
    const matchesSearch =
      s.tokenSymbol.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
      s.tokenName.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
      s.beneficiary.toLowerCase().includes(scheduleSearch.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (scheduleFilter === "active") return !s.revoked && s.released < s.amountTotal;
    if (scheduleFilter === "completed") return s.released >= s.amountTotal;
    if (scheduleFilter === "revoked") return s.revoked;
    return true;
  });

  // Admin New Schedule Form State
  const [adminBeneficiary, setAdminBeneficiary] = useState("");
  const [adminTokenSymbol, setAdminTokenSymbol] = useState("AET");
  const [adminTokenName, setAdminTokenName] = useState("Aether Premium");
  const [adminTokenAddress, setAdminTokenAddress] = useState("0x1f9840a85d5af5bf1d1762f925bdaddc4201f984");
  const [adminAmount, setAdminAmount] = useState("");
  const [adminStart, setAdminStart] = useState("");
  const [adminDuration, setAdminDuration] = useState("");
  const [adminCliff, setAdminCliff] = useState("");
  const [adminRevocable, setAdminRevocable] = useState(true);

  // Claim specific schedule state
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimAmountInput, setClaimAmountInput] = useState<{ [key: string]: string }>({});

  const handleClaimSubmit = async (scheduleId: string) => {
    const inputVal = parseFloat(claimAmountInput[scheduleId] || "0");
    if (isNaN(inputVal) || inputVal <= 0) return;
    setClaimingId(scheduleId);
    await claimTokens(scheduleId, inputVal);
    setClaimingId(null);
    setClaimAmountInput((prev) => ({ ...prev, [scheduleId]: "" }));
  };

  const handleClaimAllSubmit = async (scheduleId: string) => {
    setClaimingId(scheduleId);
    await claimAllTokens(scheduleId);
    setClaimingId(null);
  };

  // Mock charts projection data (monthly release)
  const chartData = [
    { name: "Month 1", Unlocked: 10, Projected: 12 },
    { name: "Month 2", Unlocked: 25, Projected: 28 },
    { name: "Month 3", Unlocked: 45, Projected: 48 },
    { name: "Month 4", Unlocked: 65, Projected: 68 },
    { name: "Month 5", Unlocked: 80, Projected: 85 },
    { name: "Month 6", Unlocked: 95, Projected: 100 },
  ];

  if (!mounted) return null;

  // Command palette items filtering
  const commandPaletteItems = [
    { title: "Dashboard", description: "View portfolio insights and summaries", tab: "dashboard", icon: LayoutDashboard },
    { title: "Claim Tokens", description: "Release vested capital to active wallet", tab: "claim", icon: Coins },
    { title: "Admin Panel", description: "Deploy contracts or configure vesting parameters", tab: "admin", icon: ShieldCheck },
    { title: "Interactive Analytics", description: "Unlock forecasts & capital distributions", tab: "analytics", icon: LineChart },
    { title: "Vesting Timeline", description: "Interactive milestone progressions", tab: "timeline", icon: CalendarDays },
    { title: "System Notifications", description: "Activity history & logs status", tab: "notifications", icon: Bell },
    { title: "Profile / Wallet Audit", description: "Security audits & multi-chain summaries", tab: "profile", icon: User },
  ].filter(
    (item) =>
      item.title.toLowerCase().includes(paletteSearch.toLowerCase()) ||
      item.description.toLowerCase().includes(paletteSearch.toLowerCase())
  );

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      onMouseMove={handleMouseMove}
      style={{
        ["--mouse-x" as any]: `${mousePos.x}px`,
        ["--mouse-y" as any]: `${mousePos.y}px`,
      }}
    >
      {/* Dynamic Grid Background with Mouse Reactive Gradients */}
      <div className="absolute inset-0 z-0 bg-[#020202] pointer-events-none" />
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#0c0c0c_1px,transparent_1px),linear-gradient(to_bottom,#0c0c0c_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none opacity-40" />
      <div className="absolute inset-0 z-0 interactive-gradient pointer-events-none" />

      {/* Floating Decorative Blur Widgets */}
      <div className="absolute top-1/4 left-1/10 w-96 h-96 rounded-full bg-purple-600/10 blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/10 w-[30rem] h-[30rem] rounded-full bg-emerald-600/5 blur-3xl pointer-events-none animate-pulse-slow" />

      {/* Landing Page */}
      {activeTab === "landing" && (
        <div className="flex-1 flex flex-col z-10 max-w-7xl mx-auto px-6 py-12 justify-center">
          {/* Header */}
          <nav className="w-full flex items-center justify-between py-6 mb-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 tracking-tight font-sans">
                AetherVesting
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              {isConnected ? (
                <button
                  onClick={() => {
                    setIsDemoMode(false);
                    setActiveTab("dashboard");
                  }}
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-medium hover:bg-zinc-800 transition duration-200"
                >
                  Enter Console
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsDemoMode(true);
                    setActiveTab("dashboard");
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 hover:border-purple-500/60 text-sm font-semibold hover:bg-purple-600/10 text-purple-300 transition duration-200 cursor-pointer"
                >
                  Explore Demo Mode
                </button>
              )}
            </div>
          </nav>

          {/* Hero Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center flex-1">
            <div className="lg:col-span-7 flex flex-col gap-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 w-fit">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold text-purple-300 tracking-wide uppercase">
                  Institutional Capital Lockup Portal
                </span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] bg-clip-text text-transparent bg-gradient-to-b from-white via-zinc-100 to-zinc-500">
                Automated Token Vesting, <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">
                  AI-Powered Analytics
                </span>
              </h1>
              
              <p className="text-lg text-zinc-400 max-w-xl leading-relaxed">
                Streamline token grants, lockups, and milestone release distributions. Manage capital operations with premium dashboards, predictive unlock forecasting, and institutional security controls.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                {isConnected ? (
                  <button
                    onClick={() => setActiveTab("dashboard")}
                    className="px-8 py-4 rounded-xl bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-white/10"
                  >
                    Launch Application <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      connect({ connector: injected() });
                      setActiveTab("dashboard");
                    }}
                    className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold hover:opacity-95 transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer"
                  >
                    Connect Web3 Wallet <Wallet className="w-5 h-5" />
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setIsDemoMode(true);
                    setActiveTab("dashboard");
                  }}
                  className="px-8 py-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold hover:bg-zinc-800 transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Simulation Playground <Terminal className="w-5 h-5 text-purple-400" />
                </button>
              </div>

              {/* Trust indicators */}
              <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-zinc-900/60 max-w-lg">
                <div>
                  <span className="block text-2xl font-bold text-white">$150M+</span>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Volume Locked</span>
                </div>
                <div>
                  <span className="block text-2xl font-bold text-white">99.9%</span>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Uptime SLA</span>
                </div>
                <div>
                  <span className="block text-2xl font-bold text-white">0%</span>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Capital Exploits</span>
                </div>
              </div>
            </div>

            {/* Premium App Preview Image / Card Stack */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="w-full max-w-[420px] aspect-[4/5] glass-accent rounded-3xl p-8 flex flex-col justify-between glow-purple relative overflow-hidden animate-float">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
                
                {/* Simulated Widget Content */}
                <div className="flex justify-between items-start z-10">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Active Vesting</span>
                    <span className="text-2xl font-black text-white">$150,000.00</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                  </div>
                </div>

                <div className="my-8 z-10">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Vested Progression</span>
                  <div className="w-full bg-zinc-900 h-3.5 rounded-full overflow-hidden border border-zinc-800">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full w-[65%]" />
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400 mt-2 font-medium">
                    <span>65,000 AET (Vested)</span>
                    <span>100,000 AET (Total)</span>
                  </div>
                </div>

                <div className="glass rounded-2xl p-4 border border-zinc-800 z-10">
                  <div className="flex items-center gap-3 mb-2 text-purple-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">AI Portfolio Audit</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Vesting unlock health: <strong className="text-emerald-400">98% Perfect</strong>. Your next major release of $2,450 occurs in exactly 2 days. Portfolio risk category remains ultra-low.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Console Console Wrapper */}
      {activeTab !== "landing" && (
        <div className="flex-1 flex overflow-hidden z-10">
          {/* Dashboard Left Sidebar */}
          <aside className="w-64 border-r border-zinc-900/60 bg-[#050505]/70 backdrop-blur-xl flex flex-col p-6 gap-8 justify-between">
            <div className="flex flex-col gap-8">
              {/* App Brand */}
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("landing")}>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-600/20">
                  <Sparkles className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="text-md font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                  AetherVesting
                </span>
              </div>

              {/* Main Nav Links */}
              <nav className="flex flex-col gap-1.5">
                {[
                  { id: "dashboard", label: "Overview Console", icon: LayoutDashboard },
                  { id: "claim", label: "Claim Lockups", icon: Coins },
                  { id: "admin", label: "Admin Controller", icon: ShieldCheck },
                  { id: "analytics", label: "Forecast Analytics", icon: LineChart },
                  { id: "timeline", label: "Unlock Timeline", icon: CalendarDays },
                  { id: "notifications", label: "Alert Center", icon: Bell, count: notifications.filter(n => !n.read).length },
                  { id: "profile", label: "Wallet Insights", icon: User },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setViewingScheduleId(null);
                      }}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition duration-150 ${
                        isSelected
                          ? "bg-purple-600/10 border border-purple-500/20 text-purple-400 glow-purple"
                          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/40 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${isSelected ? "text-purple-400" : "text-zinc-400"}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.count && item.count > 0 ? (
                        <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center font-bold">
                          {item.count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Sidebar Bottom Wallet Section */}
            <div className="flex flex-col gap-4">
              {isDemoMode ? (
                <div className="p-4 rounded-2xl glass-accent flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-purple-400">
                    <Terminal className="w-4.5 h-4.5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Demo Simulation</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    Running in sandbox mode with live interactions and mocks enabled.
                  </p>
                  <button
                    onClick={() => {
                      connect({ connector: injected() });
                    }}
                    className="w-full py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl glass flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active Connected</span>
                    <button onClick={() => disconnect()} className="text-zinc-500 hover:text-red-400 transition">
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-mono text-purple-400 font-bold block truncate">
                      {address}
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
                      Mainnet Wallet
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between text-xs text-zinc-500 px-2">
                <span>Press <kbd className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-400">Ctrl+K</kbd></span>
                <button onClick={() => setShowCommandPalette(true)} className="hover:text-zinc-300">Palette</button>
              </div>
            </div>
          </aside>

          {/* Main Dashboard Screen Viewports */}
          <main className="flex-1 flex flex-col overflow-y-auto px-10 py-8 relative">
            
            {/* 1. Overview Console (Dashboard) */}
            {activeTab === "dashboard" && (
              <div className="flex flex-col gap-8">
                {/* AI Portfolio Overview Section */}
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                      Overview Console
                    </h2>
                    <span className="text-sm text-zinc-400">
                      Automated institutional locked capital metrics.
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={exportData}
                      className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-bold text-zinc-300 flex items-center gap-2 transition duration-200"
                    >
                      <Download className="w-4 h-4" /> Export Config
                    </button>
                    <button
                      onClick={() => setActiveTab("claim")}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-extrabold text-white flex items-center gap-2 transition duration-200"
                    >
                      <Coins className="w-4 h-4" /> Quick Release
                    </button>
                  </div>
                </div>

                {/* AI Intelligence Box Widget */}
                <div className="p-6 rounded-3xl glass border border-purple-500/20 glow-purple flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-purple-400 uppercase tracking-widest">AETHER CAPITAL INTELLIGENCE</span>
                      <p className="text-sm text-zinc-300 max-w-2xl leading-relaxed">
                        Asset locking efficiency is at <strong className="text-emerald-400">98.4% capacity</strong>. Calculated lock volatility risk remains in the <strong className="text-purple-400">Vesting-Safe zone</strong>. Total claimable assets are valued at <strong className="text-white">${claimableUSD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong> with the next automated cliff release in 2 days.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("analytics")}
                    className="px-4 py-2.5 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 border border-purple-500/20 text-xs font-bold tracking-wider uppercase shrink-0 transition"
                  >
                    Open Forecasts
                  </button>
                </div>

                {/* Analytics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { label: "Locked Reserve Balance", value: `$${totalLockedUSD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: Lock, color: "text-purple-400" },
                    { label: "Total Claimed Capital", value: `$${totalClaimedUSD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: Unlock, color: "text-zinc-400" },
                    { label: "Claimable Right Now", value: `$${claimableUSD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: Coins, color: "text-emerald-400" },
                    { label: "Reserve Risk Metric", value: riskIndicator.toUpperCase(), icon: AlertTriangle, color: riskIndicator === "low" ? "text-emerald-400" : "text-amber-400" },
                  ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                      <div key={idx} className="p-6 rounded-2xl glass border border-zinc-900 flex flex-col justify-between aspect-[16/10]">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</span>
                          <Icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <span className="text-2xl font-black text-white tracking-tight mt-4">{stat.value}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Charts and Active Schedules section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column: Interactive Release Chart */}
                  <div className="lg:col-span-7 flex flex-col gap-6 p-6 rounded-3xl glass border border-zinc-900">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Token Release Progression</span>
                        <span className="text-lg font-extrabold text-white">Cumulative Distribution</span>
                      </div>
                      <div className="inline-flex gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
                        <button className="px-3 py-1 rounded-lg bg-purple-600/10 border border-purple-500/20 text-purple-400 text-xs font-bold">1M</button>
                        <button className="px-3 py-1 rounded-lg text-zinc-400 text-xs font-semibold hover:text-white">6M</button>
                        <button className="px-3 py-1 rounded-lg text-zinc-400 text-xs font-semibold hover:text-white">1Y</button>
                      </div>
                    </div>

                    <div className="h-72 w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorUnlocked" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#121214" vertical={false} />
                          <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "12px", color: "#fafafa" }} />
                          <Area type="monotone" dataKey="Unlocked" stroke="#a855f7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUnlocked)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Right Column: Wallet Health Score and Lock Forecast details */}
                  <div className="lg:col-span-5 flex flex-col gap-6 p-6 rounded-3xl glass border border-zinc-900 justify-between">
                    <div className="flex flex-col gap-4">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Asset Locking Projections</span>
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-zinc-400">Lock Health Rating</span>
                          <span className="text-2xl font-black text-emerald-400 mt-1">{walletHealthScore}% Perfect</span>
                        </div>
                        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 flex items-center justify-center">
                          <ShieldCheck className="w-6 h-6 text-emerald-400" />
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Unlock Outlook</span>
                        {[
                          { title: "Estimation Unlock (30d)", amount: `$${(totalLockedUSD * 0.05).toLocaleString(undefined, {maximumFractionDigits: 0})}`, progress: 5 },
                          { title: "Estimation Unlock (90d)", amount: `$${(totalLockedUSD * 0.18).toLocaleString(undefined, {maximumFractionDigits: 0})}`, progress: 18 },
                          { title: "Estimation Unlock (180d)", amount: `$${(totalLockedUSD * 0.45).toLocaleString(undefined, {maximumFractionDigits: 0})}`, progress: 45 },
                        ].map((outlook, idx) => (
                          <div key={idx} className="flex flex-col gap-1.5 p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/40">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-zinc-400 font-semibold">{outlook.title}</span>
                              <span className="font-extrabold text-white">{outlook.amount}</span>
                            </div>
                            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" style={{ width: `${outlook.progress}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-time Activity Logs */}
                <div className="p-6 rounded-3xl glass border border-zinc-900 flex flex-col gap-6">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Audit Trails</span>
                      <span className="text-lg font-extrabold text-white">Real-Time Activity Feed</span>
                    </div>
                    <button
                      onClick={() => setActiveTab("notifications")}
                      className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-bold text-zinc-300 transition duration-150"
                    >
                      View Full History
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {logs.slice(0, 3).map((log) => (
                      <div key={log.id} className="p-4 rounded-2xl border border-zinc-900 bg-zinc-950/20 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <div className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center ${
                            log.type === "claim" ? "bg-emerald-500/10 text-emerald-400" :
                            log.type === "create" ? "bg-purple-500/10 text-purple-400" :
                            "bg-amber-500/10 text-amber-400"
                          }`}>
                            {log.type === "claim" ? <Coins className="w-4 h-4" /> :
                             log.type === "create" ? <PlusCircle className="w-4 h-4" /> :
                             <AlertCircle className="w-4 h-4" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-white capitalize">{log.type} Transaction</span>
                            <span className="text-xs text-zinc-500">
                              {new Date(log.timestamp).toLocaleDateString()} at {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="flex flex-col text-right">
                            <span className="font-extrabold text-white">
                              {log.type === "claim" ? "-" : "+"} {log.amount.toLocaleString()} {log.tokenSymbol}
                            </span>
                            <span className="text-xs text-zinc-500 font-mono tracking-tighter truncate max-w-[120px]">
                              {log.txHash}
                            </span>
                          </div>
                          <a
                            href={`https://etherscan.io/tx/${log.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                          >
                            <ArrowUpRight className="w-4.5 h-4.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Claim Lockups */}
            {activeTab === "claim" && (
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-1">
                  <h2 className="text-3xl font-extrabold tracking-tight text-white">Claim Lockups</h2>
                  <span className="text-sm text-zinc-400">Release active vested capital directly to your authenticated Web3 address.</span>
                </div>

                {/* Schedules grid for claim */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {schedules.map((schedule) => {
                    const time = Math.floor(Date.now() / 1000);
                    let vested = 0;
                    if (time >= schedule.cliff) {
                      if (time >= schedule.start + schedule.duration) {
                        vested = schedule.amountTotal;
                      } else {
                        vested = Math.floor((schedule.amountTotal * (time - schedule.start)) / schedule.duration);
                      }
                    }
                    const claimable = Math.max(0, vested - schedule.released);
                    const isFullyClaimed = schedule.released >= schedule.amountTotal;
                    
                    const progressPercent = Math.min(100, Math.floor((schedule.released / schedule.amountTotal) * 100));
                    const vestedPercent = Math.min(100, Math.floor((vested / schedule.amountTotal) * 100));

                    return (
                      <div key={schedule.id} className={`p-8 rounded-3xl glass border flex flex-col justify-between gap-6 relative overflow-hidden ${
                        schedule.revoked ? "border-red-500/10 bg-red-500/1" : "border-zinc-900 hover:border-zinc-800/80"
                      }`}>
                        
                        {/* Status ribbon */}
                        {schedule.revoked ? (
                          <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold uppercase text-red-400 tracking-wider">
                            Revoked
                          </span>
                        ) : isFullyClaimed ? (
                          <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
                            Fully Vested
                          </span>
                        ) : (
                          <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold uppercase text-purple-400 tracking-wider">
                            Active Vesting
                          </span>
                        )}

                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs text-zinc-500 uppercase tracking-widest font-black">GRANT IDENTIFIER: {schedule.id.substring(0, 10)}</span>
                          <span className="text-2xl font-black text-white">{schedule.tokenName} ({schedule.tokenSymbol})</span>
                        </div>

                        {/* Visual Progress ring */}
                        <div className="flex justify-between items-center py-4 border-y border-zinc-900/60 my-2">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                              <span className="text-xs text-zinc-400 font-semibold">Total Grant: <strong>{schedule.amountTotal.toLocaleString()} {schedule.tokenSymbol}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                              <span className="text-xs text-zinc-400 font-semibold">Total Claimed: <strong>{schedule.released.toLocaleString()} {schedule.tokenSymbol}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                              <span className="text-xs text-zinc-400 font-semibold">Total Vested: <strong>{vested.toLocaleString()} {schedule.tokenSymbol} ({vestedPercent}%)</strong></span>
                            </div>
                          </div>
                          
                          {/* Radial lock progress */}
                          <div className="w-20 h-20 rounded-full border-4 border-zinc-800 flex items-center justify-center relative">
                            <span className="text-xs font-black text-white">{progressPercent}%</span>
                            <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-r-purple-500 pointer-events-none" />
                          </div>
                        </div>

                        {/* Action Inputs */}
                        {!schedule.revoked && !isFullyClaimed && (
                          <div className="flex flex-col gap-3">
                            <div className="flex gap-3">
                              <input
                                type="number"
                                placeholder={`Max claim: ${claimable.toLocaleString()}`}
                                value={claimAmountInput[schedule.id] || ""}
                                onChange={(e) => setClaimAmountInput({ ...claimAmountInput, [schedule.id]: e.target.value })}
                                className="flex-1 px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-purple-500 text-white"
                                max={claimable}
                              />
                              <button
                                onClick={() => handleClaimSubmit(schedule.id)}
                                disabled={claimingId === schedule.id || claimable <= 0}
                                className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-xs font-bold text-white uppercase tracking-wider shrink-0 transition"
                              >
                                {claimingId === schedule.id ? "Releasing..." : "Claim"}
                              </button>
                            </div>
                            
                            <button
                              onClick={() => handleClaimAllSubmit(schedule.id)}
                              disabled={claimingId === schedule.id || claimable <= 0}
                              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-xs font-black text-white uppercase tracking-widest shadow-md shadow-purple-600/10 transition"
                            >
                              Release All Available ({claimable.toLocaleString()} {schedule.tokenSymbol})
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Admin Controller */}
            {activeTab === "admin" && (
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-1">
                  <h2 className="text-3xl font-extrabold tracking-tight text-white">Admin Controller</h2>
                  <span className="text-sm text-zinc-400">Configure new vesting schedules and manage emergency contract withdrawals.</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Create Vesting Schedule Form */}
                  <div className="lg:col-span-7 p-8 rounded-3xl glass border border-zinc-900 flex flex-col gap-6">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">Deploy New Schedule</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Beneficiary Wallet Address</label>
                        <input
                          type="text"
                          placeholder="0x..."
                          value={adminBeneficiary}
                          onChange={(e) => setAdminBeneficiary(e.target.value)}
                          className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-purple-500 text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Token Amount</label>
                        <input
                          type="number"
                          placeholder="e.g. 100000"
                          value={adminAmount}
                          onChange={(e) => setAdminAmount(e.target.value)}
                          className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-purple-500 text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Token Symbol</label>
                        <input
                          type="text"
                          placeholder="e.g. AET"
                          value={adminTokenSymbol}
                          onChange={(e) => setAdminTokenSymbol(e.target.value)}
                          className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-purple-500 text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Token Address</label>
                        <input
                          type="text"
                          placeholder="0x..."
                          value={adminTokenAddress}
                          onChange={(e) => setAdminTokenAddress(e.target.value)}
                          className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-purple-500 text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Vesting Duration (seconds)</label>
                        <input
                          type="number"
                          placeholder="e.g. 31536000 (1 year)"
                          value={adminDuration}
                          onChange={(e) => setAdminDuration(e.target.value)}
                          className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-purple-500 text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Vesting Cliff (seconds)</label>
                        <input
                          type="number"
                          placeholder="e.g. 2592000 (30 days)"
                          value={adminCliff}
                          onChange={(e) => setAdminCliff(e.target.value)}
                          className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-purple-500 text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 p-4 bg-zinc-950 border border-zinc-900 rounded-2xl">
                      <input
                        type="checkbox"
                        checked={adminRevocable}
                        onChange={(e) => setAdminRevocable(e.target.checked)}
                        className="w-5 h-5 accent-purple-500 cursor-pointer"
                        id="revocable-check"
                      />
                      <label htmlFor="revocable-check" className="text-xs font-semibold text-zinc-300 cursor-pointer select-none">
                        Revocable Schedule (Owner retains right to cancel lockups and recover remaining unvested tokens)
                      </label>
                    </div>

                    <button
                      onClick={() => {
                        if (!adminBeneficiary || !adminAmount || !adminDuration) return;
                        createSchedule({
                          beneficiary: adminBeneficiary,
                          tokenSymbol: adminTokenSymbol,
                          tokenName: adminTokenName,
                          tokenAddress: adminTokenAddress,
                          start: Math.floor(Date.now() / 1000),
                          cliff: parseInt(adminCliff) || 0,
                          duration: parseInt(adminDuration),
                          slicePeriodSeconds: 1,
                          amountTotal: parseFloat(adminAmount),
                          revocable: adminRevocable,
                          usdRate: 2.50,
                        });
                        setAdminBeneficiary("");
                        setAdminAmount("");
                        setAdminDuration("");
                        setAdminCliff("");
                      }}
                      className="w-full py-4.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-sm font-black text-white uppercase tracking-widest shadow-lg shadow-purple-600/10 transition"
                    >
                      Deploy Vesting Schedule
                    </button>
                  </div>

                  {/* Emergency Controller */}
                  <div className="lg:col-span-5 flex flex-col gap-8">
                    <div className="p-8 rounded-3xl glass border border-zinc-900 flex flex-col gap-6">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">Emergency Reserve Control</span>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        In case of accidental tokens deposits or key recovery procedures, withdraw excess unlocked reserves from the contract vault securely. Locked schedule capital remains protected.
                      </p>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">ERC20 Token Address</label>
                        <input
                          type="text"
                          placeholder="0x..."
                          className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-purple-500 text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Withdrawal Amount</label>
                        <input
                          type="number"
                          placeholder="e.g. 5000"
                          className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-purple-500 text-white"
                        />
                      </div>

                      <button
                        onClick={() => emergencyWithdraw("0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", 5000)}
                        className="w-full py-3.5 rounded-xl bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-500/20 text-xs font-bold uppercase tracking-wider transition"
                      >
                        Execute Vault Withdrawal
                      </button>
                    </div>

                    {/* Schedule Active table */}
                    <div className="p-6 rounded-3xl glass border border-zinc-900 flex flex-col gap-4">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">Vesting Schedules Directory</span>
                      
                      <div className="flex flex-col gap-3.5">
                        {schedules.map((s) => (
                          <div key={s.id} className="flex justify-between items-center text-xs p-3 rounded-xl border border-zinc-900 bg-zinc-950/10">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-white">{s.tokenSymbol} Schedule</span>
                              <span className="text-[10px] text-zinc-500 truncate max-w-[100px]">{s.beneficiary}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-extrabold text-white">{s.amountTotal.toLocaleString()}</span>
                              {s.revocable && !s.revoked ? (
                                <button
                                  onClick={() => revokeSchedule(s.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 text-red-400 font-black uppercase text-[9px] tracking-wide transition"
                                >
                                  Revoke
                                </button>
                              ) : (
                                <span className="text-[9px] uppercase font-bold text-zinc-600">Fixed</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Forecast Analytics */}
            {activeTab === "analytics" && (
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-1">
                  <h2 className="text-3xl font-extrabold tracking-tight text-white">Forecast Analytics</h2>
                  <span className="text-sm text-zinc-400">Unlock simulations, predictive insights, and deep-dive distribution allocations.</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Projections charts */}
                  <div className="lg:col-span-8 p-8 rounded-3xl glass border border-zinc-900 flex flex-col gap-6">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">Unlock Volume Projections</span>
                    
                    <div className="h-96 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#121214" vertical={false} />
                          <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "12px", color: "#fafafa" }} />
                          <Bar dataKey="Unlocked" fill="#a855f7" radius={[6, 6, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#a855f7" : "#6366f1"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* AI insights deep dive */}
                  <div className="lg:col-span-4 p-8 rounded-3xl glass border border-zinc-900 flex flex-col gap-6 justify-between">
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center gap-3 text-purple-400">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-widest">AI CAPITAL DEEP AUDIT</span>
                      </div>
                      
                      {[
                        { title: "Optimal Unlock Speed", rating: "Optimal", desc: "Your continuous unlock frequencies minimize market sell pressure.", color: "text-emerald-400" },
                        { title: "Risk Mitigation rating", rating: "Low Volatility", desc: "No revocability risk detected on 66.6% of your vesting portfolio.", color: "text-purple-400" },
                        { title: "Capital Efficiency Score", rating: "98/100", desc: "Automated distribution cycles avoid secondary lockup delays.", color: "text-indigo-400" },
                      ].map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-1.5 border-b border-zinc-900 pb-4 last:border-0 last:pb-0">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-white">{item.title}</span>
                            <span className={`text-[10px] font-black uppercase tracking-wider ${item.color}`}>{item.rating}</span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-normal">{item.desc}</p>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setActiveTab("timeline")}
                      className="w-full py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 uppercase tracking-wider hover:bg-zinc-800 transition"
                    >
                      Audit Full Milestones
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Unlock Timeline */}
            {activeTab === "timeline" && (
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-1">
                  <h2 className="text-3xl font-extrabold tracking-tight text-white">Unlock Timeline</h2>
                  <span className="text-sm text-zinc-400">Chronological vertical mapping of lockup milestones and cliffs.</span>
                </div>

                {/* Vertical interactive timeline */}
                <div className="max-w-2xl mx-auto w-full p-8 rounded-3xl glass border border-zinc-900 flex flex-col gap-10 relative">
                  <div className="absolute left-12.5 top-12 bottom-12 w-0.5 bg-zinc-800 pointer-events-none" />

                  {[
                    { date: "Oct 2025", title: "Aether Vested Start", desc: "Initialization of 100,000 AET linear vest grant allocation", status: "completed", color: "bg-purple-500" },
                    { date: "Nov 2025", title: "USDC Vesting Cliff", desc: "First release hurdle for USD Stablecoin vesting lockups", status: "completed", color: "bg-purple-500" },
                    { date: "May 2026", title: "Current Date Progress", desc: "Portfolio locking operations currently running at 98% health", status: "active", color: "bg-emerald-400 animate-ping" },
                    { date: "Jun 2026", title: "OP Reward Cliff", desc: "Cliff cliff duration locks complete; daily linear unlocking starts", status: "pending", color: "bg-zinc-700" },
                    { date: "Aug 2026", title: "Aether Unlocks Complete", desc: "Final 100% distribution cycle completion for Aether Utility tokens", status: "pending", color: "bg-zinc-700" },
                  ].map((milestone, idx) => (
                    <div key={idx} className="flex gap-8 relative items-start">
                      <div className="w-10 text-right text-[10px] font-bold text-zinc-500 uppercase tracking-widest pt-1">{milestone.date}</div>
                      
                      {/* Timeline circle node */}
                      <div className="relative shrink-0 z-10">
                        <div className={`w-5 h-5 rounded-full ${milestone.color} flex items-center justify-center`}>
                          <div className="w-2.5 h-2.5 rounded-full bg-[#030303]" />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-extrabold text-white">{milestone.title}</span>
                        <span className="text-xs text-zinc-400 leading-normal">{milestone.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Alert Center */}
            {activeTab === "notifications" && (
              <div className="flex flex-col gap-8">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-3xl font-extrabold tracking-tight text-white">Alert Center</h2>
                    <span className="text-sm text-zinc-400">Capital releases, contract updates, and system notifications logs.</span>
                  </div>
                  <button
                    onClick={markAllNotificationsRead}
                    className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-bold text-zinc-300 transition"
                  >
                    Mark All Read
                  </button>
                </div>

                <div className="max-w-3xl flex flex-col gap-4">
                  {notifications.map((n) => (
                    <div key={n.id} className={`p-6 rounded-2xl border flex gap-4 items-start ${
                      n.read ? "bg-zinc-950/10 border-zinc-900/60 opacity-60" : "bg-purple-950/5 border-purple-500/10 glow-purple"
                    }`}>
                      <div className={`p-2 rounded-lg ${
                        n.type === "success" ? "bg-emerald-500/10 text-emerald-400" :
                        n.type === "warning" ? "bg-amber-500/10 text-amber-400" :
                        "bg-blue-500/10 text-blue-400"
                      }`}>
                        {n.type === "success" ? <CheckCircle2 className="w-5 h-5" /> :
                         n.type === "warning" ? <AlertCircle className="w-5 h-5" /> :
                         <Info className="w-5 h-5" />}
                      </div>
                      
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white text-sm">{n.title}</span>
                          <span className="text-[10px] text-zinc-500">{new Date(n.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">{n.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. Wallet Insights (Profile) */}
            {activeTab === "profile" && (
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-1">
                  <h2 className="text-3xl font-extrabold tracking-tight text-white">Wallet Insights</h2>
                  <span className="text-sm text-zinc-400">Security audit reporting and cross-wallet allocation insights.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Security score */}
                  <div className="p-8 rounded-3xl glass border border-zinc-900 flex flex-col gap-6">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">Contract Safety Audit</span>
                    
                    <div className="flex flex-col gap-4 border-b border-zinc-900 pb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-400 uppercase">AetherVesting Solidity Version</span>
                        <span className="text-xs font-mono font-bold text-white">v0.8.28 (Evm: Cancun)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-400 uppercase">Standard Reentrancy Guard</span>
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Enabled</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-400 uppercase">Emergency Withdraw Guard</span>
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Enabled</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-900 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-purple-400">
                        <Info className="w-4.5 h-4.5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Security Advisor Note</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Vesting contract is fully optimized to avoid double-claiming exploits. The contract uses OpenZeppelin's standard safeTransfer library to prevent transaction reversion issues.
                      </p>
                    </div>
                  </div>

                  {/* Multi wallet allocation */}
                  <div className="p-8 rounded-3xl glass border border-zinc-900 flex flex-col gap-6">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">Multi-Wallet Capital Projections</span>
                    
                    <div className="flex flex-col gap-4">
                      {[
                        { wallet: "Primary Lock (0x7099...)", allocation: "83%", amount: "$198,000", color: "bg-purple-500" },
                        { wallet: "Founder Reserve (0x3C44...)", allocation: "17%", amount: "$45,500", color: "bg-indigo-500" },
                      ].map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-2 p-4 rounded-xl border border-zinc-900 bg-zinc-950/20">
                          <div className="flex justify-between text-xs items-center">
                            <span className="font-bold text-white">{item.wallet}</span>
                            <span className="font-black text-zinc-400">{item.amount} ({item.allocation})</span>
                          </div>
                          <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                            <div className={`h-full ${item.color} rounded-full`} style={{ width: item.allocation }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Futuristic Command Palette Modal Dialog */}
      <AnimatePresence>
        {showCommandPalette && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[#000000]/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-xl p-6 rounded-3xl glass border border-zinc-800 glow-purple flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <div className="flex items-center gap-2.5 text-purple-400">
                  <Search className="w-5 h-5 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider">Aether Command Console</span>
                </div>
                <button onClick={() => setShowCommandPalette(false)} className="text-zinc-500 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <input
                type="text"
                placeholder="Type a command or page name..."
                value={paletteSearch}
                onChange={(e) => setPaletteSearch(e.target.value)}
                className="w-full px-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-sm focus:outline-none focus:border-purple-500 text-white font-semibold"
                autoFocus
              />

              <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
                {commandPaletteItems.length > 0 ? (
                  commandPaletteItems.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveTab(item.tab);
                          setShowCommandPalette(false);
                          setPaletteSearch("");
                        }}
                        className="flex items-center gap-3.5 px-4 py-3 rounded-xl hover:bg-purple-600/10 hover:border-purple-500/20 text-left border border-transparent transition duration-100"
                      >
                        <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-800 shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">{item.title}</span>
                          <span className="text-[10px] text-zinc-500 leading-normal">{item.description}</span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <span className="text-xs text-zinc-500 text-center py-6">No matching actions found.</span>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
