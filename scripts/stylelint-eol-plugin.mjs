import stylelint from 'stylelint'

const { report, ruleMessages, validateOptions } = stylelint.utils

const ruleName = 'studycat/eol-last'
const messages = ruleMessages(ruleName, {
    expected: 'Expected a newline at the end of the file',
})

const rule = (primary) => {
    return (root, result) => {
        const validOptions = validateOptions(result, ruleName, { actual: primary })
        if (!validOptions) return

        const css = root.source?.input?.css ?? ''
        if (css.length > 0 && !css.endsWith('\n')) {
            report({
                message: messages.expected,
                node: root,
                result,
                ruleName,
            })
        }
    }
}

rule.ruleName = ruleName
rule.messages = messages

export default stylelint.createPlugin(ruleName, rule)
