import '@mantine/core/styles.css';

import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';
import { AuthProvider } from '@/lib/auth-context';

export const metadata = {
    title: 'StudyCAT',
    description: 'StudyCAT is an educational quiz application using computerized adaptive testing (CAT).',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" {...mantineHtmlProps}>
            <head>
                <ColorSchemeScript defaultColorScheme="light" />
            </head>
            <body>
                <MantineProvider defaultColorScheme="light">
                    <AuthProvider requireAuth={false}>
                        {children}
                    </AuthProvider>
                </MantineProvider>
            </body>
        </html>
    );
}