import "./globals.css";

export const metadata = {
  title: "LiteraGo",
  description: "Aplikasi peminjaman item digital LiteraGo"
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
