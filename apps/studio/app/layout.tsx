import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
    title: "OpenLoRA Studio",
    description: "Advanced LoRA Management Platform",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem={false}
                    disableTransitionOnChange
                >
                    <div className="flex h-full">
                        <Sidebar />
                        <main className="flex-1 h-full overflow-y-auto bg-background">
                            {children}
                        </main>
                    </div>
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    );
}
