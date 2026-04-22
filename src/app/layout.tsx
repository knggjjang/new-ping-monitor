import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "New Ping Monitor",
  description: "Premium Network Monitoring Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-transparent antialiased">
        <main className="h-screen w-screen overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
