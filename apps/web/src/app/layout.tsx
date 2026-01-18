import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: {
        default: 'StoryForge Kids',
        template: '%s | StoryForge Kids',
    },
    description:
        'Create personalized audio stories for your children with AI-powered storytelling',
    keywords: ['stories', 'children', 'audio', 'personalized', 'AI', 'kids'],
    authors: [{ name: 'StoryForge Kids' }],
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'StoryForge Kids',
    },
};

export const viewport: Viewport = {
    themeColor: '#6366f1',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="fr">
            <body className="antialiased">{children}</body>
        </html>
    );
}
