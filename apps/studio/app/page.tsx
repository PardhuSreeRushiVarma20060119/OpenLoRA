"use client";

import { Activity, ArrowUpRight, Cpu, Server, Users, Zap, Box } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, TooltipProps } from "recharts";

const data = [
    { name: "Jan", total: 12 },
    { name: "Feb", total: 21 },
    { name: "Mar", total: 18 },
    { name: "Apr", total: 35 },
    { name: "May", total: 42 },
    { name: "Jun", total: 55 },
    { name: "Jul", total: 89 },
];

export default function Home() {
    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
                    <p className="text-muted-foreground">
                        Real-time overview of your OpenLoRA cluster.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="flex items-center px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-sm font-medium">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></div>
                        System Healthy
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Active Models"
                    value="12"
                    icon={Box}
                    trend="+2.5%"
                    trendUp={true}
                    description="Running in inference"
                />
                <StatCard
                    title="GPU Utilization"
                    value="87%"
                    icon={Cpu}
                    trend="+12%"
                    trendUp={true}
                    description="Across 4 nodes"
                />
                <StatCard
                    title="Total Requests"
                    value="1.2M"
                    icon={Activity}
                    trend="+4%"
                    trendUp={true}
                    description="Past 24 hours"
                />
                <StatCard
                    title="Active Users"
                    value="342"
                    icon={Users}
                    trend="+11%"
                    trendUp={true}
                    description="Learning in University"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

                {/* Chart Section */}
                <div className="col-span-4 glass-card rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-medium text-white">Inference Traffic</h3>
                            <p className="text-sm text-gray-400">Requests per second over time</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="name"
                                    stroke="#525252"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#525252"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}`}
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-sm">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                                Total
                                                            </span>
                                                            <span className="font-bold text-muted-foreground">
                                                                {payload[0].value}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorTotal)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="col-span-3 glass-card rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-medium text-white">Recent Activity</h3>
                            <p className="text-sm text-gray-400">Latest system events</p>
                        </div>
                    </div>
                    <div className="space-y-8">
                        <ActivityItem
                            title="Model Deployment"
                            desc="Llama-3-70b-Instruct deployed to Node-01"
                            time="2m ago"
                            icon={Server}
                            color="text-blue-500 bg-blue-500/10"
                        />
                        <ActivityItem
                            title="Training Started"
                            desc="Fine-tuning job #4922 started by @pardhu"
                            time="15m ago"
                            icon={Zap}
                            color="text-yellow-500 bg-yellow-500/10"
                        />
                        <ActivityItem
                            title="Adapter Registered"
                            desc="New adapter 'medical-diagnosis-v2' added"
                            time="1h ago"
                            icon={Box}
                            color="text-purple-500 bg-purple-500/10"
                        />
                        <ActivityItem
                            title="User Enrollment"
                            desc="New user joined OpenUniversity"
                            time="3h ago"
                            icon={Users}
                            color="text-emerald-500 bg-emerald-500/10"
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, trend, trendUp, description }: any) {
    return (
        <div className="glass-card rounded-xl p-6 hover:bg-white/5 transition duration-200">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-gray-400">{title}</p>
                <Icon className="h-4 w-4 text-gray-400" />
            </div>
            <div className="flex items-center pt-2">
                <div className="text-2xl font-bold text-white mr-2">{value}</div>
                <div className={`text-xs font-medium flex items-center ${trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {trendUp ? <ArrowUpRight className="h-3 w-3 mr-1" /> : null}
                    {trend}
                </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
                {description}
            </p>
        </div>
    )
}

function ActivityItem({ title, desc, time, icon: Icon, color }: any) {
    return (
        <div className="flex items-center">
            <div className={`h-9 w-9 rounded-full flex items-center justify-center mr-4 ${color}`}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="space-y-1 flex-1">
                <p className="text-sm font-medium text-white leading-none">{title}</p>
                <p className="text-xs text-muted-foreground">
                    {desc}
                </p>
            </div>
            <div className="text-xs text-muted-foreground">{time}</div>
        </div>
    )
}
