"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Database,
    Zap,
    Activity,
    GitBranch,
    Settings,
    GraduationCap,
    Box,
    Cpu
} from "lucide-react";
import { cn } from "@/lib/utils";

const routes = [
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/",
        color: "text-sky-500",
    },
    {
        label: "Orchestrator",
        icon: Cpu,
        href: "/orchestrator",
        color: "text-violet-500",
    },
    {
        label: "Experiments",
        icon: Box,
        href: "/experiments",
        color: "text-pink-700",
    },
    {
        label: "Datasets",
        icon: Database,
        href: "/datasets",
        color: "text-emerald-500",
    },
    {
        label: "Adapters",
        icon: GitBranch,
        href: "/adapters",
        color: "text-orange-500",
    },
    {
        label: "University",
        icon: GraduationCap,
        href: "/university",
        color: "text-yellow-500",
    },
    {
        label: "Metrics",
        icon: Activity,
        href: "/metrics",
        color: "text-green-500",
    },
    {
        label: "Deploy",
        icon: Zap,
        href: "/deploy",
        color: "text-blue-500",
    },
    {
        label: "Settings",
        icon: Settings,
        href: "/settings",
    },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-sidebar/50 backdrop-blur-xl border-r border-border/40 text-sidebar-foreground">
            <div className="px-3 py-2 flex-1">
                <Link href="/" className="flex items-center pl-3 mb-14">
                    <div className="relative w-8 h-8 mr-4 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                        <span className="font-bold text-primary-foreground">OP</span>
                    </div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        OpenLoRA++
                    </h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer rounded-lg transition-all duration-200",
                                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                pathname === route.href
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                                    : "text-muted-foreground"
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5 mr-3 transition-colors", pathname === route.href ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
