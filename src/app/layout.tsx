import type { Metadata } from "next";
import "./globals.css";
import { NextAuthProvider } from "@/components/NextAuthProvider";
import { AppTracker } from "@/components/AppTracker";
import AIChatWidget from "@/components/AIChatWidget";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { OnlineSyncManager } from "@/components/OnlineSyncManager";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { SessionGuard } from "@/components/SessionGuard";

export const metadata: Metadata = {
  title: "מעדנצ'יק - מלכות קוגל",
  description: "מערכת ניהול הזמנות מתקדמת",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "מעדנצ'יק",
  },
};

export const viewport = {
  themeColor: "#1e40af",
};export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`antialiased bg-[#f8f9fc] print:bg-white`}>
        <NextAuthProvider>
          <ServiceWorkerRegister />
          <OfflineIndicator />
          <OnlineSyncManager />
          <SessionGuard />
          <div className="max-w-md print:max-w-none mx-auto min-h-[100dvh] bg-white shadow-2xl print:shadow-none relative overflow-x-hidden print:overflow-visible">
            <div className="print:hidden">
              <AppTracker />
            </div>
            {children}
            <div className="print:hidden relative z-[9999]">
              <AIChatWidget />
            </div>
          </div>
        </NextAuthProvider>
      </body>
    </html>
  );
}
