import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { CartProvider } from "@/hooks/use-cart";
import { WaitRoomProvider } from "@/hooks/use-wait-room";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "BarberParadise",
  description: "Barbería moderna y elegante.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
          <WaitRoomProvider>
            <CartProvider>
              {children}
              <Toaster />
            </CartProvider>
          </WaitRoomProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
