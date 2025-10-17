export const getBloomColor = (bloom: string) => {
    const colors: Record<string, string> = {
        REMEMBER: 'blue',
        UNDERSTAND: 'green',
        APPLY: 'yellow',
        ANALYZE: 'orange',
        EVALUATE: 'red',
        CREATE: 'purple'
    }
    return colors[bloom] || 'gray'
}