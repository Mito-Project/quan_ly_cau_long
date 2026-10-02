import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Badminton Manager",
  description: "Quản lý nhóm cầu lông, buổi chơi và thanh toán",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
