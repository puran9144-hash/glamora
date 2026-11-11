import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "GLAMORA | Founder Admin", description: "Secure GLAMORA company dashboard" };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
