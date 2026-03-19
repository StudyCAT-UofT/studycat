import { globSync, readFileSync } from 'fs'

const files = globSync('app/**/*.css')
let fail = false

for (const f of files) {
    const content = readFileSync(f)
    if (content.length === 0 || content[content.length - 1] !== 10) {
        console.error(`Missing newline at end of file: ${f}`)
        fail = true
    }
}

if (fail) process.exit(1)
else console.log(`✓ All ${files.length} CSS file(s) end with a newline.`)
