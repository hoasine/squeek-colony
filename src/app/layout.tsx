import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Squeek Colony — Lantern Hollow",
  description:
    "A persistent cooperative world whose fate is decided by real Squeekchain rounds.",
  openGraph: {
    title: "Squeek Colony",
    description: "Build together. Let the wheel decide.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Squeek Colony",
    description: "A living cooperative world powered by real Squeekchain rounds.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          theme="dark"
          position="bottom-center"
          toastOptions={{ className: "colony-toast" }}
        />
      </body>
    </html>
  );
}
