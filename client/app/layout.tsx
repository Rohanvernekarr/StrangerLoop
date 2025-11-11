import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StrangerLoop - Random Video Chat',
  description: 'Connect with random strangers via video chat',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
