import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Öökull – Harno sisejuhendite abiline",
  description: "Viidatud vastused Harno sisejuhenditest, korrast ja määrustest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="et">
      <body className="antialiased">{children}</body>
    </html>
  );
}
