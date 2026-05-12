import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CrewGO — Find Your Crew in Lahore',
  description: 'Match with people going to the same event. Form a crew, chat with AI, live the moment.',
  keywords: ['events', 'lahore', 'social', 'crew', 'friends', 'AI'],
  openGraph: {
    title: 'CrewGO',
    description: 'Find your crew. Live the moment.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-[#0F0F1A] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
