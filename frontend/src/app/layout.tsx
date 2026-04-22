import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { UserProfileProvider } from "@/components/providers/UserProfileProvider";
import { SettlementNotification } from "@/components/ui/SettlementNotification";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Foresight | Predict the Future",
  description: "A premium prediction market with iOS 17 & visionOS aesthetics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <Script
          id="error-handler"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (e.message.indexOf('Invalid property descriptor') !== -1 || e.filename.indexOf('chrome-extension') !== -1) {
                  e.stopImmediatePropagation();
                  e.preventDefault();
                }
              }, true);
            `,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <Web3Provider>
          <SocketProvider>
            <UserProfileProvider>
              <div className="aurora-bg">
                <div className="aurora-element w-[600px] h-[600px] bg-ios-blue/20 -top-20 -left-20 animate-pulse" />
                <div className="aurora-element w-[500px] h-[500px] bg-ios-purple/20 bottom-0 -right-20 [animation-delay:2s]" />
                <div className="aurora-element w-[400px] h-[400px] bg-ios-yellow/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 [animation-delay:4s]" />
              </div>
              
              <Navbar />
              <SettlementNotification />
              
              <main className="min-h-screen pt-24 pb-32 md:pb-12">
                {children}
              </main>
            </UserProfileProvider>
          </SocketProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
