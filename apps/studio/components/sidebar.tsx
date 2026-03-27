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
    Cpu,
    ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainRoutes = [
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/",
        activeIconClass: "bg-blue-400/10 text-blue-400",
        hoverIconClass: "group-hover:text-blue-400",
    },
    {
        label: "Orchestrator",
        icon: Cpu,
        href: "/orchestrator",
        activeIconClass: "bg-violet-400/10 text-violet-400",
        hoverIconClass: "group-hover:text-violet-400",
    },
    {
        label: "Experiments",
        icon: Box,
        href: "/experiments",
        activeIconClass: "bg-pink-400/10 text-pink-400",
        hoverIconClass: "group-hover:text-pink-400",
    },
    {
        label: "Datasets",
        icon: Database,
        href: "/datasets",
        activeIconClass: "bg-emerald-400/10 text-emerald-400",
        hoverIconClass: "group-hover:text-emerald-400",
    },
    {
        label: "Adapters",
        icon: GitBranch,
        href: "/adapters",
        activeIconClass: "bg-orange-400/10 text-orange-400",
        hoverIconClass: "group-hover:text-orange-400",
    },
];

const toolRoutes = [
    {
        label: "Marketplace",
        icon: ShoppingBag,
        href: "/marketplace",
        activeIconClass: "bg-purple-400/10 text-purple-400",
        hoverIconClass: "group-hover:text-purple-400",
    },
    {
        label: "University",
        icon: GraduationCap,
        href: "/university",
        activeIconClass: "bg-yellow-400/10 text-yellow-400",
        hoverIconClass: "group-hover:text-yellow-400",
    },
    {
        label: "Metrics",
        icon: Activity,
        href: "/metrics",
        activeIconClass: "bg-cyan-400/10 text-cyan-400",
        hoverIconClass: "group-hover:text-cyan-400",
    },
    {
        label: "Deploy",
        icon: Zap,
        href: "/deploy",
        activeIconClass: "bg-sky-400/10 text-sky-400",
        hoverIconClass: "group-hover:text-sky-400",
    },
];

const bottomRoutes = [
    {
        label: "Settings",
        icon: Settings,
        href: "/settings",
        activeIconClass: "bg-muted/60 text-muted-foreground",
        hoverIconClass: "group-hover:text-foreground",
    },
];

function NavItem({ route, isActive }: { route: typeof mainRoutes[number]; isActive: boolean }) {
    return (
        <Link
            href={route.href}
            className={cn(
                "group flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium",
                "transition-all duration-150 ease-out",
                isActive
                    ? "bg-white/[0.06] text-foreground nav-active-bar"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
            )}
        >
            <span className={cn(
                "flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors duration-150",
                isActive ? route.activeIconClass : cn("bg-transparent text-muted-foreground", route.hoverIconClass)
            )}>
                <route.icon className="h-4 w-4" />
            </span>
            <span className="leading-none">{route.label}</span>
            {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
            )}
        </Link>
    );
}

function SectionLabel({ label }: { label: string }) {
    return (
        <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">
            {label}
        </p>
    );
}

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="flex flex-col w-60 shrink-0 h-full bg-sidebar border-r border-sidebar-border">
            {/* Logo */}
            <div className="px-4 pt-5 pb-4">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20 shrink-0">
                        <span className="text-xs font-bold text-white tracking-tight">OL</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-foreground leading-none truncate">
                            OpenLoRA
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight tracking-wide mt-0.5">
                            Studio
                        </span>
                    </div>
                </Link>
            </div>

            {/* Divider */}
            <div className="mx-4 h-px bg-border/60" />

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                <SectionLabel label="Core" />
                {mainRoutes.map((route) => (
                    <NavItem key={route.href} route={route} isActive={pathname === route.href} />
                ))}

                <SectionLabel label="Tools" />
                {toolRoutes.map((route) => (
                    <NavItem key={route.href} route={route} isActive={pathname === route.href} />
                ))}
            </nav>

            {/* Bottom — Settings + version */}
            <div className="p-2 border-t border-border/60">
                {bottomRoutes.map((route) => (
                    <NavItem key={route.href} route={route} isActive={pathname === route.href} />
                ))}
                <div className="mt-2 px-3 py-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground/40 font-mono">v0.1.0</span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/80 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
