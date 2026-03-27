"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Copy, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";

export default function SettingsPage() {
    const [showKey, setShowKey] = useState(false);

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in-up">
            <PageHeader
                title="Settings"
                description="Manage your workspace, credentials, and preferences"
            />

            <Tabs defaultValue="profile" className="space-y-5">
                <TabsList className="bg-muted/40 border border-border/60 h-9">
                    <TabsTrigger value="profile" className="text-xs h-7">Profile</TabsTrigger>
                    <TabsTrigger value="api-keys" className="text-xs h-7">API Keys</TabsTrigger>
                    <TabsTrigger value="notifications" className="text-xs h-7">Notifications</TabsTrigger>
                    <TabsTrigger value="billing" className="text-xs h-7">Billing</TabsTrigger>
                </TabsList>

                {/* ── Profile ── */}
                <TabsContent value="profile" className="space-y-4">
                    <Card className="glass-card border-border/50 bg-card/50">
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold">Profile</CardTitle>
                            <CardDescription className="text-xs">
                                This is how others will see you on the platform.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="username" className="text-xs font-medium">Username</Label>
                                    <Input id="username" defaultValue="demo-user" className="h-9 text-sm bg-muted/40 border-border/60" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                                    <Input id="email" defaultValue="demo@openlora.dev" className="h-9 text-sm bg-muted/40 border-border/60" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="bio" className="text-xs font-medium">Bio</Label>
                                <Input id="bio" placeholder="Tell us about yourself…" className="h-9 text-sm bg-muted/40 border-border/60" />
                            </div>
                        </CardContent>
                        <CardFooter className="border-t border-border/40 pt-4">
                            <Button size="sm" className="text-xs">Save Changes</Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* ── API Keys ── */}
                <TabsContent value="api-keys" className="space-y-4">
                    <Card className="glass-card border-border/50 bg-card/50">
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold">API Keys</CardTitle>
                            <CardDescription className="text-xs">
                                API keys allow programmatic access to the OpenLoRA SDK.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/60 bg-muted/20">
                                <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-foreground">Default Key</p>
                                        <Badge variant="outline" className="text-[10px] border-emerald-400/30 text-emerald-400 bg-emerald-400/10">
                                            Active
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground font-mono tracking-wider">
                                        {/* Demo placeholder — production keys are loaded from secure env / backend */}
                                        {showKey ? "sk_live_abc123def456…4829" : "sk_live_●●●●●●●●●●●●●4829"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                        onClick={() => setShowKey(!showKey)}
                                    >
                                        {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400/70 hover:text-red-400">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t border-border/40 pt-4">
                            <Button variant="outline" size="sm" className="text-xs gap-2 border-border/60">
                                <Plus className="h-3.5 w-3.5" />
                                Create New Key
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* ── Notifications ── */}
                <TabsContent value="notifications" className="space-y-4">
                    <Card className="glass-card border-border/50 bg-card/50">
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold">Notifications</CardTitle>
                            <CardDescription className="text-xs">
                                Choose what you want to be notified about.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 divide-y divide-border/40">
                            {[
                                {
                                    label: "Training Complete",
                                    desc: "Email notification when a training job finishes.",
                                    defaultChecked: true,
                                },
                                {
                                    label: "Job Failed",
                                    desc: "Immediate alert if a training run fails.",
                                    defaultChecked: true,
                                },
                                {
                                    label: "Marketplace Updates",
                                    desc: "Weekly digest of new adapters and top picks.",
                                    defaultChecked: false,
                                },
                                {
                                    label: "System Alerts",
                                    desc: "GPU over-temperature or cluster health issues.",
                                    defaultChecked: false,
                                },
                            ].map((n) => (
                                <div key={n.label} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                                    <div className="space-y-0.5 min-w-0 pr-4">
                                        <Label className="text-sm font-medium text-foreground">{n.label}</Label>
                                        <p className="text-xs text-muted-foreground">{n.desc}</p>
                                    </div>
                                    <Switch defaultChecked={n.defaultChecked} className="shrink-0" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Billing (placeholder) ── */}
                <TabsContent value="billing">
                    <Card className="glass-card border-border/50 bg-card/50">
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold">Billing</CardTitle>
                            <CardDescription className="text-xs">
                                Manage your subscription and payment methods.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
                                <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center">
                                    <span className="text-2xl">💳</span>
                                </div>
                                <p className="text-sm font-medium text-foreground">Billing not yet configured</p>
                                <p className="text-xs text-muted-foreground">OpenLoRA is currently free during early access.</p>
                                <Badge variant="outline" className="mt-1 border-emerald-400/30 text-emerald-400 bg-emerald-400/10">
                                    Free Tier
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
