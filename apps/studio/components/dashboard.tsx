"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock, Zap, Server, Box, Layers } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Types for data fetching
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

// Mock data for charts (until we have historical data API)
const resourceHistory = [
    { time: '00:00', gpu: 30, cpu: 20 },
    { time: '04:00', gpu: 45, cpu: 35 },
    { time: '08:00', gpu: 85, cpu: 70 },
    { time: '12:00', gpu: 92, cpu: 85 },
    { time: '16:00', gpu: 78, cpu: 65 },
    { time: '20:00', gpu: 60, cpu: 45 },
];

const adapterDistribution = [
    { name: 'Llama 3', value: 45, color: 'hsl(var(--chart-1))' },
    { name: 'Mistral', value: 32, color: 'hsl(var(--chart-2))' },
    { name: 'Stable Diff', value: 23, color: 'hsl(var(--chart-3))' },
];

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

    // Fetch real data from microservices
    useEffect(() => {
        const fetchData = async () => {
            try {
                // In a real scenario, these would be calls to:
                // - localhost:8090/stats (Core API)
                // - localhost:8081/jobs (Orchestrator)
                // Using simulated response for now to demonstrate UI integration

                // Simulating API call delay
                await new Promise(resolve => setTimeout(resolve, 800));

                setStats({
                    gpu_utilization: 87,
                    cpu_utilization: 65,
                    memory_utilization: 72,
                    active_models: 12,
                    active_jobs: 3,
                    total_requests: 1254300,
                });

                setJobs([
                    { id: "job-1", name: "Fine-tune Llama-3-70b", status: "running", progress: 67 },
                    { id: "job-2", name: "Eval Mistral-7b-v0.2", status: "pending", progress: 0 },
                    { id: "job-3", name: "LoRA Merge (Code)", status: "completed", progress: 100 },
                ]);

                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return <div className="p-8 text-muted-foreground animate-pulse">Loading dashboard telemetry...</div>;
    }

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
                    <p className="text-muted-foreground">Overview of your OpenLoRA Cluster</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-sm font-medium">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    System Operational
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Active Models" value={stats.active_models} icon={Box} trend="+2 new" />
                <StatCard
                    title="GPU Utilization"
                    value={`${stats.gpu_utilization}%`}
                    icon={Zap}
                    trend="+12%"
                    trendUp={true}
                    className={stats.gpu_utilization > 80 ? "border-amber-500/50 bg-amber-500/5" : ""}
                />
                <StatCard title="Active Jobs" value={stats.active_jobs} icon={Layers} trend="Processing" />
                <StatCard title="Total Request" value={(stats.total_requests / 1000000).toFixed(1) + "M"} icon={Activity} trend="+8.5%" trendUp={true} />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* Main Chart */}
                <Card className="col-span-4 glass-card border-border/50 bg-card/50">
                    <CardHeader>
                        <CardTitle>Resource Usage</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={resourceHistory}>
                                <defs>
                                    <linearGradient id="colorGpu" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                                <Area type="monotone" dataKey="gpu" stroke="hsl(var(--chart-1))" fillOpacity={1} fill="url(#colorGpu)" strokeWidth={2} />
                                <Area type="monotone" dataKey="cpu" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Job Status & Adapter Dist */}
                <div className="col-span-3 space-y-6">
                    <Card className="glass-card border-border/50 bg-card/50">
                        <CardHeader>
                            <CardTitle>Training Jobs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {jobs.map(job => (
                                    <div key={job.id} className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">{job.name}</span>
                                            <span className="text-muted-foreground">{job.progress}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full transition-all duration-500",
                                                    job.status === 'completed' ? "bg-emerald-500" :
                                                        job.status === 'failed' ? "bg-red-500" : "bg-primary"
                                                )}
                                                style={{ width: `${job.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-border/50 bg-card/50">
                        <CardHeader>
                            <CardTitle>Model Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={adapterDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {adapterDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, trend, trendUp, className }: any) {
    return (
        <Card className={cn("glass-card border-border/50 bg-card/50 transition-colors hover:bg-accent/50", className)}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center pt-2">
                    <div className="text-2xl font-bold">{value}</div>
                    {trend && (
                        <div className={cn("ml-auto text-xs font-medium px-2 py-0.5 rounded-full",
                            trendUp ? "text-emerald-500 bg-emerald-500/10" : "text-muted-foreground bg-secondary"
                        )}>
                            {trend}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
