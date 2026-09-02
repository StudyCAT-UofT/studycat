import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/charts/styles.css';
import 'mantine-datatable/styles.layer.css';
import './overrides.css';

import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { AuthProvider } from '@/lib/auth-context';
import { CourseProvider } from '@/lib/course-context';

export const metadata = {
    title: 'Catalyze',
    description: 'Catalyze is an educational quiz application using computerized adaptive testing (CAT).',
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
                    <Notifications position="top-right" zIndex={1000} />
                    <AuthProvider requireAuth={false}>
                        <CourseProvider>
                            {children}
                        </CourseProvider>
                    </AuthProvider>
                </MantineProvider>
            </body>
        </html>
    );
}
