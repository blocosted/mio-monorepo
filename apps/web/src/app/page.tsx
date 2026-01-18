import Link from 'next/link';

export default function HomePage() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-8">
            <div className="max-w-2xl text-center space-y-8">
                {/* Hero */}
                <div className="space-y-4">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                        Mio
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300">
                        Create magical, personalized audio stories for your children
                    </p>
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950 dark:to-pink-900">
                        <div className="text-4xl mb-3">🎨</div>
                        <h3 className="font-semibold mb-2">Personalized</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Stories tailored to your child&apos;s interests and age
                        </p>
                    </div>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                        <div className="text-4xl mb-3">🎧</div>
                        <h3 className="font-semibold mb-2">Audio Magic</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Professional narration with music and sound effects
                        </p>
                    </div>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                        <div className="text-4xl mb-3">✨</div>
                        <h3 className="font-semibold mb-2">AI Powered</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Unique stories generated in minutes
                        </p>
                    </div>
                </div>

                {/* CTA */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/profiles"
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/30"
                    >
                        Get Started
                    </Link>
                    <Link
                        href="/library"
                        className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl transition-colors border border-gray-200 dark:border-gray-700"
                    >
                        View Library
                    </Link>
                </div>
            </div>
        </main>
    );
}
