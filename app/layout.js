import "./globals.css";

export const metadata = {
  title: "SupportFlow — AI-assisted customer support",
  description: "A focused AI-assisted customer support desk for managing support tickets.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
