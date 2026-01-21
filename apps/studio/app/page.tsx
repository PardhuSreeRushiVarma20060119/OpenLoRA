import Link from 'next/link';
import { Activity, Box, Database, GitMerge, Server, Shield, GraduationCap, Github } from 'lucide-react';

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center p-8 lg:p-24 bg-gradient-to-br from-slate-950 to-slate-900 border-white/5">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <div className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
                    <code className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                        OpenLoRA++
                    </code>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        System Healthy
                    </div>
                </div>
            </div>

            <div className="relative flex place-items-center my-16">
                <h1 className="text-6xl font-black text-center tracking-tighter">
                    The <span className="text-blue-500">Universal</span> Adapter OS
                </h1>
            </div>

            <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left gap-4">

                <Card
                    title="Orchestrator"
                    icon={<Activity className="w-6 h-6 text-blue-400" />}
                    desc="GPU allocation & Job scheduling"
                    href="http://localhost:8081/health"
                />
                <Card
                    title="Experiments"
                    icon={<Box className="w-6 h-6 text-purple-400" />}
                    desc="Track runs & metrics"
                    href="http://localhost:8082/health"
                />
                <Card
                    title="Governance"
                    icon={<Shield className="w-6 h-6 text-red-400" />}
                    desc="Security & Provenance"
                    href="#"
                />
                <Card
                    title="University"
                    icon={<GraduationCap className="w-6 h-6 text-yellow-400" />}
                    desc="Interactive Learning"
                    href="http://localhost:8088/health"
                />

            </div>
        </main>
    );
}

function Card({ title, icon, desc, href }: { title: string, icon: any, desc: string, href: string }) {
    return (
        <a
            href={href}
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
            target="_blank"
            rel="noopener noreferrer"
        >
            <div className="mb-3 flex items-center gap-3">
                {icon}
                <h2 className={`mb-0 text-xl font-semibold`}>
                    {title}
                </h2>
            </div>
            <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
                {desc}
            </p>
        </a>
    )
}
