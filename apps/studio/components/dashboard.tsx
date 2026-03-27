"use client";

import { useEffect, useState } from "react";
import {
    Activity, Zap, Server, Box, Layers,
    TrendingUp, TrendingDown, Minus
} from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { OrchestratorAPI } from "@/lib/api";

interface SystemStats {
    gpu_utilization: number;
    cpu_utilization: number;
    memory_utilization: number;
    active_models: number;
    active_jobs: number;
    total_requests: number;
}

interface Job {
    id: string;
    name: string;
    status: "running" | "completed" | "failed" | "pending";
    progress: number;
}

const resourceHistory = [
    { time: '00:00', gpu: 30, cpu: 20 },
    { time: '04:00', gpu: 45, cpu: 35 },
    { time: '08:00', gpu: 85, cpu: 70 },
    { time: '12:00', gpu: 92, cpu: 85 },
    { time: '16:00', gpu: 78, cpu: 65 },
    { time: '20:00', gpu: 60, cpu: 45 },
];

const adapterDistribution = [
    { name: 'Llama 3',      value: 45, color: 'hsl(var(--chart-1))' },
    { name: 'Mistral',      value: 32, color: 'hsl(var(--chart-2))' },
    { name: 'Stable Diff',  value: 23, color: 'hsl(var(--chart-3))' },
];

// ─────────────────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <Card className="glass-card border-border/50 bg-card/50">
            <CardContent className="p-6 space-y-3">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-8 w-16" />
                <div className="skeleton h-3 w-20" />
            </CardContent>
        </Card>
    );
}

function DashboardSkeleton() {
    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in">
            {/* header */}
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <div className="skeleton h-7 w-36" />
                    <div className="skeleton h-4 w-52" />
                </div>
                <div className="skeleton h-8 w-36 rounded-full" />
            </div>
            {/* KPI row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-7">
                <div className="col-span-4">
                    <Card className="glass-card border-border/50 bg-card/50">
                        <CardContent className="p-6">
                            <div className="skeleton h-[300px] w-full" />
                        </CardContent>
                    </Card>
                </div>
                <div className="col-span-3 space-y-6">
                    <Card className="glass-card border-border/50 bg-card/50">
                        <CardContent className="p-6 space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="skeleton h-3 w-full" />
                                    <div className="skeleton h-2 w-full rounded-full" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card className="glass-card border-border/50 bg-card/50">
                        <CardContent className="p-6">
                            <div className="skeleton h-[160px] w-full rounded-full mx-auto" style={{ maxWidth: 160 }} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────
interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    trend?: string;
    trendDir?: "up" | "down" | "neutral";
    accentColor?: string;   // Tailwind bg color for icon container
    iconColor?: string;     // Tailwind text color for icon
    className?: string;
}

function StatCard({ title, value, icon: Icon, trend, trendDir = "neutral", accentColor = "bg-blue-500/10", iconColor = "text-blue-400", className }: StatCardProps) {
    const TrendIcon = trendDir === "up" ? TrendingUp : trendDir === "down" ? TrendingDown : Minus;
    const trendClass = trendDir === "up"
        ? "text-emerald-400 bg-emerald-400/10"
        : trendDir === "down"
            ? "text-red-400 bg-red-400/10"
            : "text-muted-foreground bg-muted/60";

    return (
        <Card className={cn(
            "glass-card border-border/50 bg-card/50 transition-all duration-200",
            "hover:shadow-card-lg hover:-translate-y-px",
            className
        )}>
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase mb-3">
                            {title}
                        </p>
                        <p className="text-2xl font-bold text-foreground tracking-tight leading-none">
                            {value}
                        </p>
                        {trend && (
                            <div className={cn(
                                "inline-flex items-center gap-1 mt-2.5 text-xs font-medium px-1.5 py-0.5 rounded-md",
                                trendClass
                            )}>
                                <TrendIcon className="h-3 w-3" />
                                {trend}
                            </div>
                        )}
                    </div>
                    <div className={cn("p-2.5 rounded-lg shrink-0", accentColor)}>
                        <Icon className={cn("h-5 w-5", iconColor)} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ─────────────────────────────────────────────────────────
// Job status badge
// ─────────────────────────────────────────────────────────
const statusStyles: Record<string, string> = {
    running:   "text-blue-400 bg-blue-400/10",
    completed: "text-emerald-400 bg-emerald-400/10",
    failed:    "text-red-400 bg-red-400/10",
    pending:   "text-amber-400 bg-amber-400/10",
};
const progressColors: Record<string, string> = {
    running:   "bg-blue-400",
    completed: "bg-emerald-400",
    failed:    "bg-red-400",
    pending:   "bg-amber-400",
};

// ─────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────
export function Dashboard() {
    const [stats, setStats] = useState<SystemStats>({
        gpu_utilization: 0,
        cpu_utilization: 0,
        memory_utilization: 0,
        active_models: 0,
        active_jobs: 0,
        total_requests: 0,
    });
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSystemHealthy, setSystemHealthy] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [orchStats, activeJobs] = await Promise.all([
                    OrchestratorAPI.getStats(),
                    OrchestratorAPI.getJobs().catch(() => [])
                ]);

                setStats({
                    gpu_utilization:    orchStats?.gpu_utilization    || 0,
                    cpu_utilization:    orchStats?.cpu_utilization    || 0,
                    memory_utilization: orchStats?.memory_utilization || 0,
                    active_models:      orchStats?.active_models      || 0,
                    active_jobs:        orchStats?.active_jobs        || 0,
                    total_requests:     orchStats?.total_requests     || 0,
                });

                setJobs(Array.isArray(activeJobs) ? activeJobs.slice(0, 5) : []);
                setSystemHealthy(true);
                setLoading(false);
            } catch {
                setSystemHealthy(false);
                setLoading(false);
                console.error("[Dashboard] Failed to fetch data");
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in-up">
            {/* ── Header ── */}
            <div className="flex flex-wrap gap-4 justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Live overview of your OpenLoRA cluster
                    </p>
                </div>
                <div className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border",
                    isSystemHealthy
                        ? "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400"
                        : "border-red-500/30 bg-red-500/[0.08] text-red-400"
                )}>
                    <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSystemHealthy ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                    )} />
                    {isSystemHealthy ? "All Systems Operational" : "Connection Error"}
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Active Models"
                    value={stats.active_models}
                    icon={Box}
                    trend="+2 new"
                    trendDir="up"
                    accentColor="bg-violet-500/10"
                    iconColor="text-violet-400"
                />
                <StatCard
                    title="GPU Utilization"
                    value={`${stats.gpu_utilization}%`}
                    icon={Zap}
                    trend={stats.gpu_utilization > 80 ? "High load" : "+12%"}
                    trendDir={stats.gpu_utilization > 80 ? "down" : "up"}
                    accentColor={stats.gpu_utilization > 80 ? "bg-amber-500/10" : "bg-blue-500/10"}
                    iconColor={stats.gpu_utilization > 80 ? "text-amber-400" : "text-blue-400"}
                    className={stats.gpu_utilization > 80 ? "border-amber-500/30" : ""}
                />
                <StatCard
                    title="Active Jobs"
                    value={stats.active_jobs}
                    icon={Layers}
                    trend="Processing"
                    trendDir="neutral"
                    accentColor="bg-emerald-500/10"
                    iconColor="text-emerald-400"
                />
                <StatCard
                    title="Total Requests"
                    value={(stats.total_requests / 1_000_000).toFixed(1) + "M"}
                    icon={Activity}
                    trend="+8.5%"
                    trendDir="up"
                    accentColor="bg-pink-500/10"
                    iconColor="text-pink-400"
                />
            </div>

            {/* ── Charts ── */}
            <div className="grid gap-6 lg:grid-cols-7">
                {/* Resource Usage */}
                <Card className="col-span-4 glass-card border-border/50 bg-card/50">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-foreground">
                                Resource Usage
                            </CardTitle>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-400" />GPU
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400" />CPU
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pl-2 pr-4">
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={resourceHistory} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                                <defs>
                                    <linearGradient id="colorGpu" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="hsl(217 91% 60%)" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0}    />
                                    </linearGradient>
                                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="hsl(158 64% 52%)" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="hsl(158 64% 52%)" stopOpacity={0}    />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="hsl(var(--border))"
                                    opacity={0.3}
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="time"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                                />
                                <YAxis
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `${v}%`}
                                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                                    width={36}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        borderColor: 'hsl(var(--border))',
                                        borderRadius: '8px',
                                        fontSize: 12,
                                    }}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                    labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                                />
                                <Area type="monotone" dataKey="gpu" stroke="hsl(217 91% 60%)" strokeWidth={2} fillOpacity={1} fill="url(#colorGpu)" />
                                <Area type="monotone" dataKey="cpu" stroke="hsl(158 64% 52%)" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Right column */}
                <div className="col-span-3 space-y-6">
                    {/* Training Jobs */}
                    <Card className="glass-card border-border/50 bg-card/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-foreground">Training Jobs</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {jobs.length === 0 ? (
                                <div className="flex flex-col items-center py-6 gap-2 text-muted-foreground">
                                    <Server className="h-8 w-8 opacity-30" />
                                    <p className="text-xs">No active jobs</p>
                                </div>
                            ) : (
                                jobs.map(job => (
                                    <div key={job.id} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-medium text-foreground truncate max-w-[60%]">{job.name}</span>
                                            <span className={cn(
                                                "px-1.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide",
                                                statusStyles[job.status] ?? "text-muted-foreground bg-muted/60"
                                            )}>
                                                {job.status}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all duration-700",
                                                    progressColors[job.status] ?? "bg-primary"
                                                )}
                                                style={{ width: `${job.progress}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground text-right">{job.progress}%</p>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Model Distribution */}
                    <Card className="glass-card border-border/50 bg-card/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-foreground">Model Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                            <ResponsiveContainer width="100%" height={160}>
                                <PieChart>
                                    <Pie
                                        data={adapterDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={48}
                                        outerRadius={65}
                                        paddingAngle={4}
                                        dataKey="value"
                                        strokeWidth={0}
                                    >
                                        {adapterDistribution.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Legend
                                        iconSize={8}
                                        iconType="circle"
                                        formatter={(value) => (
                                            <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{value}</span>
                                        )}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            borderColor: 'hsl(var(--border))',
                                            borderRadius: '8px',
                                            fontSize: 12,
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
