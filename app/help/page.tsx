'use client'

import { Container, Stack, Title, Text, Card, List, Alert, Divider, Code } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'

export default function IRTGuideForInstructors() {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Title order={1}>Understanding IRT Parameters for Your Quiz Questions</Title>

        <Alert icon={<IconInfoCircle size={16} />} color="blue">
          <Text size="sm">
            This guide explains Item Response Theory (IRT) parameters conceptually and provides practical starting points. 
            For precise calibration, you&apos;ll eventually need specialized software and sufficient student response data.
          </Text>
        </Alert>

        <Card withBorder padding="lg" radius="md">
          <Stack gap="md">
            <Title order={2}>What is Item Response Theory (IRT)?</Title>
            <Text>
              Item Response Theory is a statistical framework for analyzing how well test questions measure ability. 
              Instead of just knowing &quot;70% of students got this right,&quot; IRT uses three parameters to describe each question:
            </Text>
            <List>
              <List.Item><Text component="span" fw={500}>a (Discrimination)</Text>: How well the question separates high-ability from low-ability students</List.Item>
              <List.Item><Text component="span" fw={500}>b (Difficulty)</Text>: The ability level at which a student has a 50% chance of answering correctly (after accounting for guessing)</List.Item>
              <List.Item><Text component="span" fw={500}>c (Guessing)</Text>: The probability that a student with no knowledge gets the question right by chance</List.Item>
            </List>
          </Stack>
        </Card>

        <Card withBorder padding="lg" radius="md">
          <Stack gap="md">
            <Title order={2}>Why These Parameters Matter</Title>
            <Text>These parameters enable adaptive testing that:</Text>
            <List>
              <List.Item>Presents questions matched to each student&apos;s ability level</List.Item>
              <List.Item>Focuses on questions that provide the most information about student knowledge</List.Item>
              <List.Item>Provides more accurate ability estimates with fewer questions</List.Item>
            </List>
          </Stack>
        </Card>

        <Divider />

        <Title order={2}>The Three Parameters Explained</Title>

        {/* Parameter a: Discrimination */}
        <Card withBorder padding="lg" radius="md" style={{ backgroundColor: '#f0f7ff' }}>
          <Stack gap="md">
            <Title order={3}>Parameter a: Discrimination</Title>
            
            <Text>
              <Text component="span" fw={500}>What it measures:</Text> How effectively a question distinguishes between students who know the material and those who don&apos;t.
            </Text>

            <div>
              <Text fw={500} mb="xs">Interpretation:</Text>
              <List size="sm">
                <List.Item><Text component="span" fw={500}>Higher values (a &gt; 1.5)</Text>: Strong students get it right, weak students get it wrong - the question is doing its job well</List.Item>
                <List.Item><Text component="span" fw={500}>Moderate values (a ≈ 1.0)</Text>: Decent separation between ability levels</List.Item>
                <List.Item><Text component="span" fw={500}>Lower values (a &lt; 0.7)</Text>: Both strong and weak students have similar performance - question may be confusing or poorly written</List.Item>
              </List>
            </div>

            <div>
              <Text fw={500} mb="xs">How to evaluate discrimination (without IRT software):</Text>
              
              <Card withBorder padding="md" radius="md" style={{ backgroundColor: 'white' }}>
                <Stack gap="xs">
                  <Text fw={500}>Point-Biserial Correlation</Text>
                  <Text size="sm">
                    Many learning management systems automatically calculate point-biserial correlation, which measures how well a question score correlates with total test performance.
                  </Text>
                  
                  <Text size="sm" mt="xs"><Text component="span" fw={500}>General guidelines from assessment research:</Text></Text>
                  <List size="sm">
                    <List.Item>0.30 or higher = strong item</List.Item>
                    <List.Item>0.20 to 0.30 = acceptable item</List.Item>
                    <List.Item>0.10 to 0.20 = marginal item</List.Item>
                    <List.Item>Below 0.10 or negative = problematic item</List.Item>
                  </List>
                  
                  <Text size="sm" fs="italic" mt="xs">
                    Note: Point-biserial is related to discrimination but is not the same as the IRT a parameter. It&apos;s useful for identifying problematic questions.
                  </Text>
                </Stack>
              </Card>

              <Card withBorder padding="md" radius="md" style={{ backgroundColor: 'white' }} mt="md">
                <Stack gap="xs">
                  <Text fw={500}>Upper/Lower Group Difference</Text>
                  <Text size="sm">
                    Compare the percentage of high-performing students (top 27%) who answered correctly versus low-performing students (bottom 27%).
                  </Text>
                  
                  <List size="sm" mt="xs">
                    <List.Item>Large difference (30+ percentage points) = good discrimination</List.Item>
                    <List.Item>Moderate difference (15-30 percentage points) = acceptable discrimination</List.Item>
                    <List.Item>Small difference (&lt;15 percentage points) = poor discrimination</List.Item>
                  </List>
                  
                  <Text size="sm" fs="italic" mt="xs">
                    The 27% cutoff is based on Kelley (1939), who showed this maximizes discrimination in normally distributed data.
                  </Text>
                </Stack>
              </Card>
            </div>
          </Stack>
        </Card>

        {/* Parameter b: Difficulty */}
        <Card withBorder padding="lg" radius="md" style={{ backgroundColor: '#f0fdf4' }}>
          <Stack gap="md">
            <Title order={3}>Parameter b: Difficulty</Title>
            
            <Text>
              <Text component="span" fw={500}>What it measures:</Text> The ability level at which a student has a 50% chance of answering correctly (accounting for guessing). In IRT, difficulty is on the same scale as ability.
            </Text>

            <div>
              <Text fw={500} mb="xs">Understanding the scale:</Text>
              <List size="sm">
                <List.Item><Text component="span" fw={500}>b = 0</Text>: Average difficulty for an average-ability student</List.Item>
                <List.Item><Text component="span" fw={500}>b &lt; 0</Text>: Easier than average (negative values = easier)</List.Item>
                <List.Item><Text component="span" fw={500}>b &gt; 0</Text>: Harder than average (positive values = harder)</List.Item>
                <List.Item><Text component="span" fw={500}>Typical range:</Text> -3 to +3, though values outside this range are possible</List.Item>
              </List>
            </div>

            <div>
              <Text fw={500} mb="xs">Important note about percentage correct:</Text>
              <Text size="sm">
                The relationship between percentage correct and the b parameter is complex and depends on the discrimination (a) and guessing (c) parameters. 
                There is no simple conversion table. Proper calibration requires IRT software.
              </Text>
              
              <Text size="sm" mt="xs">
                However, you can use percentage correct as a rough guide: very easy questions (80%+ correct) likely have negative b values, 
                while very hard questions (&lt;40% correct) likely have positive b values.
              </Text>
            </div>
          </Stack>
        </Card>

        {/* Parameter c: Guessing */}
        <Card withBorder padding="lg" radius="md" style={{ backgroundColor: '#faf5ff' }}>
          <Stack gap="md">
            <Title order={3}>Parameter c: Guessing</Title>
            
            <Text>
              <Text component="span" fw={500}>What it measures:</Text> The probability that a student with zero ability gets the question right by pure chance (the lower asymptote of the item response curve).
            </Text>

            <div>
              <Text fw={500} mb="xs">Standard values by question type:</Text>
              <List size="sm">
                <List.Item><Text component="span" fw={500}>4-option multiple choice with one correct answer</Text>: c = 0.25</List.Item>
                <List.Item><Text component="span" fw={500}>4-option multiple choice with two correct answers</Text>: c = 0.50</List.Item>
              </List>
            </div>

            <Text size="sm" mt="xs">
              The guessing parameter is typically fixed at (number of correct options)/(number of options) for multiple choice questions. 
              Some researchers allow it to vary, but for most instructional purposes, using the theoretical guessing rate is appropriate.
            </Text>
          </Stack>
        </Card>

        <Divider />

        <Card withBorder padding="lg" radius="md" style={{ backgroundColor: '#fff9e6' }}>
          <Stack gap="md">
            <Title order={2}>Practical Approach: Getting Started Without IRT Software</Title>
            
            <Text>
              If you&apos;re creating questions and don&apos;t yet have student response data or access to IRT calibration software, 
              here&apos;s how to set reasonable starting values:
            </Text>

            <div>
              <Text fw={500} mb="xs">Step 1: Set the guessing parameter (c)</Text>
              <Text size="sm">Use the theoretical guessing rate based on the number of answer options (see above).</Text>
            </div>

            <div>
              <Text fw={500} mb="xs">Step 2: Set a default discrimination (a)</Text>
              <Text size="sm">Start with <Code>a = 1.0</Code> for all questions. This represents moderate discrimination.</Text>
              <Text size="sm">This is a reasonable default that you can refine later with actual data.</Text>
            </div>

            <div>
              <Text fw={500} mb="xs">Step 3: Estimate difficulty (b) based on your expert judgment</Text>
              <Text size="sm" mb="xs">Think about how difficult the question is relative to an average student in your course:</Text>
              <List size="sm">
                <List.Item>Very easy questions (you expect most students to answer correctly): <Code>b = -1.5</Code></List.Item>
                <List.Item>Easy questions: <Code>b = -0.75</Code></List.Item>
                <List.Item>Average difficulty: <Code>b = 0</Code></List.Item>
                <List.Item>Hard questions: <Code>b = 0.75</Code></List.Item>
                <List.Item>Very hard questions: <Code>b = 1.5</Code></List.Item>
              </List>
            </div>

            <Alert icon={<IconInfoCircle size={16} />} color="blue" mt="md">
              <Text fw={500} size="sm">These are starting estimates only!</Text>
              <Text size="sm">
                These estimates are not fully supported by any literature! They are simply rough estimates that seem reasonable at face value. For ideal results for your students, this parameter should be properly calculated. 
              </Text>
            </Alert>
          </Stack>
        </Card>

        <Divider />

        <Card withBorder padding="lg" radius="md">
          <Stack gap="md">
            <Title order={2}>Proper IRT Calibration (Recommended)</Title>
            
            <Text>
              For accurate parameter estimation, you need specialized software that uses maximum likelihood or Bayesian estimation methods.
            </Text>

            <div>
              <Text fw={500} mb="xs">Software options:</Text>
              <List>
                <List.Item>
                  <Text component="span" fw={500}>R packages:</Text>{' '}
                  <Code>mirt</Code> (most popular), <Code>ltm</Code>, <Code>TAM</Code>
                </List.Item>
                <List.Item>
                  <Text component="span" fw={500}>Python libraries:</Text>{' '}
                  <Code>py-irt</Code>, <Code>adaptivetesting</Code>
                </List.Item>
                <List.Item>
                  <Text component="span" fw={500}>Commercial software:</Text>{' '}
                  BILOG-MG, IRTPRO, ConQuest
                </List.Item>
              </List>
            </div>

            <div>
              <Text fw={500} mb="xs">Sample size suggestions:</Text>
              <List size="sm">
                <List.Item>Minimum: 100-200 responses per item for basic estimation</List.Item>
                <List.Item>Recommended: 500+ responses for stable estimates</List.Item>
                <List.Item>Ideal: 1000+ responses for highly accurate calibration</List.Item>
              </List>
            </div>

            <div>
              <Text fw={500} mb="xs">When to recalibrate:</Text>
              <List size="sm">
                <List.Item>After you&apos;ve collected sufficient response data (100+ per item minimum)</List.Item>
                <List.Item>If you make significant changes to question wording</List.Item>
                <List.Item>Periodically (e.g., once per semester) as you accumulate more data</List.Item>
                <List.Item>If the adaptive system seems to be selecting inappropriate questions</List.Item>
              </List>
            </div>
          </Stack>
        </Card>

        <Divider />

        <Divider />

        <Card withBorder padding="lg" radius="md">
          <Stack gap="lg">
            <Title order={2}>Frequently Asked Questions</Title>

            <div>
              <Text fw={500} mb="xs">Q: Can I just use the default values (a=1.0, c=0.25, b=0) for all questions?</Text>
              <Text size="sm">
                A: You can start with defaults, but questions genuinely do vary in difficulty and discrimination. 
                Use your expert judgment to at least estimate whether questions are easy (negative b) or hard (positive b). 
                Plan to do proper calibration once you have enough data.
              </Text>
            </div>

            <div>
              <Text fw={500} mb="xs">Q: How many student responses do I need before calibrating?</Text>
              <Text size="sm">
                A: Minimum 100-200 responses per item is suggested, but realistically, just try to get as many responses as possible.
                Start with your best guesses and refine as data accumulates.
              </Text>
            </div>

            <div>
              <Text fw={500} mb="xs">Q: What if I don&apos;t have access to IRT software?</Text>
              <Text size="sm">
                A: R and Python packages are free and well-documented. The learning curve is moderate, but worth it for accurate calibration. 
                Alternatively, consult with someone who has psychometric expertise.
              </Text>
            </div>

            <div>
              <Text fw={500} mb="xs">Q: Should I update parameters if I make minor edits to a question?</Text>
              <Text size="sm">
                A: Minor typo fixes usually don&apos;t require recalibration. But if you change the question stem, 
                modify answer options, or alter the difficulty in any meaningful way, treat it as a new question 
                and recalibrate when you have sufficient new response data.
              </Text>
            </div>

            <div>
              <Text fw={500} mb="xs">Q: Can the adaptive system work with estimated parameters?</Text>
              <Text size="sm">
                A: Yes, it will work, but accuracy improves with better calibration. Think of initial estimates as &quot;version 1.0&quot; 
                that you&apos;ll improve over time as you collect data and perform proper calibration.
              </Text>
            </div>
          </Stack>
        </Card>

        <Divider />

        <Card withBorder padding="lg" radius="md" style={{ backgroundColor: '#eff6ff' }}>
          <Stack gap="md">
            <Title order={2}>Summary: Recommended Workflow</Title>

            <div>
              <Text fw={500} mb="xs">Phase 0: Question Development and Pilot Testing</Text>
              <List type="ordered">
                <List.Item>Develop questions and pilot them on other assessment platforms (Canvas, Blackboard, etc.)</List.Item>
                <List.Item>Collect basic statistics: percentage correct, point-biserial correlation if available</List.Item>
              </List>
            </div>

            <div>
              <Text fw={500} mb="xs">Phase 1: Initial Setup (before student data)</Text>
              <List type="ordered">
                <List.Item>Set c based on question format (0.25 for 4-option MC)</List.Item>
                <List.Item>Set a = 1.0 as default for all questions</List.Item>
                <List.Item>Estimate b based on your expert judgment of difficulty (-1.5 to +1.5 range)</List.Item>
              </List>
            </div>

            <div>
              <Text fw={500} mb="xs">Phase 2: Calibration (once you have more responses per item)</Text>
              <List type="ordered">
                <List.Item>Export your response data</List.Item>
                <List.Item>Use IRT software (R/mirt, Python, or commercial) to calibrate</List.Item>
                <List.Item>Replace initial estimates with calibrated parameters</List.Item>
                <List.Item>Plan to recalibrate periodically as more data accumulates</List.Item>
              </List>
            </div>
          </Stack>
        </Card>

        <Divider />

        <Card withBorder padding="lg" radius="md">
          <Stack gap="md">
            <Title order={2}>Further Reading</Title>
            
            <Text size="sm">For those interested in learning more about IRT:</Text>
            
            <List size="sm">
              <List.Item>
                <Text component="span" fw={500}>Embretson, S. E., & Reise, S. P. (2000).</Text>{' '}
                <Text component="span" fs="italic">Item Response Theory for Psychologists.</Text> Lawrence Erlbaum Associates.
                <Text size="xs" c="dimmed"> (Accessible introduction to IRT concepts)</Text>
              </List.Item>
              <List.Item>
                <Text component="span" fw={500}>Baker, F. B., & Kim, S.-H. (2004).</Text>{' '}
                <Text component="span" fs="italic">Item Response Theory: Parameter Estimation Techniques.</Text> CRC Press.
                <Text size="xs" c="dimmed"> (Technical guide to calibration methods)</Text>
              </List.Item>
              <List.Item>
                <Text component="span" fw={500}>De Ayala, R. J. (2009).</Text>{' '}
                <Text component="span" fs="italic">The Theory and Practice of Item Response Theory.</Text> Guilford Press.
                <Text size="xs" c="dimmed"> (Comprehensive textbook)</Text>
              </List.Item>
              <List.Item>
                <Text component="span" fw={500}>Chalmers, R. P. (2012).</Text>{' '}
                mirt: A Multidimensional Item Response Theory Package for the R Environment.{' '}
                <Text component="span" fs="italic">Journal of Statistical Software, 48</Text>(6), 1-29.
                <Text size="xs" c="dimmed"> (Documentation for the most popular R package)</Text>
              </List.Item>
            </List>
          </Stack>
        </Card>
      </Stack>
    </Container>
  )
}