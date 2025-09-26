import '@mantine/core/styles.css';

import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';

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
                <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
            </body>
        </html>
    );
}