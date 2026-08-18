import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ChatBot } from "@/components/features/chat-bot";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Daily Planner",
  description: "Manage your tasks and build streaks",
};

import { AuthProvider } from "@/components/providers/auth-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className={`min-h-full flex flex-col md:flex-row bg-background text-foreground ${inter.className}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PostHogProvider>
            <AuthProvider>
              <AppSidebar />
              <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto pb-20 md:pb-0">
                {children}
              </div>
              <MobileNav />
              <Toaster position="top-center" richColors />
              <ChatBot />
            </AuthProvider>
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
