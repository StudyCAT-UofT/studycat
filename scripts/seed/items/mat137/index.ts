import type { ItemDef } from '../../types'

export const MAT137_ITEMS: ItemDef[] = [
  // ─── MAT137: Calculus with Proofs (Winter 2025) ───────────────────────────────
  {
    moduleKey: 'MAT137_Winter 2025::Limits & Continuity',
    externalQuestionId: 'MAT137-LC-001',
    bloom: 'REMEMBER',
    stem: 'What does it mean for a function f to be continuous at a point x = a?',
    reference: 'Spivak, Calculus, 4th Ed., Ch. 5',
    irtA: 0.82, irtB: -0.9, irtC: 0.21,
    options: [
      { label: 'A', text: 'f(a) exists but lim f(x) as x→a may not exist', justification: 'Continuity requires both f(a) and the limit to exist and be equal.', isCorrect: false },
      { label: 'B', text: 'lim(x→a) f(x) = f(a) (the limit exists, f(a) is defined, and they are equal)', justification: 'Continuity at a requires: (1) f(a) defined, (2) lim exists, (3) limit equals f(a).', isCorrect: true },
      { label: 'C', text: 'f(x) is differentiable at x = a', justification: 'Differentiability implies continuity, but continuity does not require differentiability.', isCorrect: false },
      { label: 'D', text: 'f is continuous everywhere in its domain', justification: 'Continuity at a point is a local property; it does not require continuity everywhere.', isCorrect: false },
    ],
  },
  {
    moduleKey: 'MAT137_Winter 2025::Limits & Continuity',
    externalQuestionId: 'MAT137-LC-002',
    bloom: 'APPLY',
    stem: 'What does the Intermediate Value Theorem guarantee for a continuous function f on [a, b] with f(a) < 0 < f(b)?',
    reference: 'Spivak, Calculus, 4th Ed., Ch. 7',
    irtA: 1.10, irtB: 0.2, irtC: 0.19,
    options: [
      { label: 'A', text: 'f has a minimum at x = a', justification: 'IVT guarantees a zero exists; it says nothing about minima.', isCorrect: false },
      { label: 'B', text: 'There exists some c in (a, b) where f(c) = 0', justification: 'IVT: if f is continuous on [a,b] and f(a) and f(b) have opposite signs, there must be a root in (a,b).', isCorrect: true },
      { label: 'C', text: 'f is differentiable on (a, b)', justification: 'IVT only requires continuity; differentiability is a separate (stronger) property.', isCorrect: false },
      { label: 'D', text: 'f is monotonically increasing on [a, b]', justification: 'IVT says nothing about monotonicity; a continuous function can have many local extrema.', isCorrect: false },
    ],
  },
  {
    moduleKey: 'MAT137_Winter 2025::Differentiation & Integration',
    externalQuestionId: 'MAT137-DI-001',
    bloom: 'APPLY',
    stem: 'What is the derivative of f(x) = x³ + 4x² − 2x + 7?',
    reference: 'Spivak, Calculus, 4th Ed., Ch. 10',
    irtA: 0.88, irtB: -0.6, irtC: 0.21,
    options: [
      { label: 'A', text: 'x² + 8x − 2', justification: 'The derivative of x³ is 3x², not x².', isCorrect: false },
      { label: 'B', text: '3x² + 8x − 2', justification: "By the power rule: d/dx(x³)=3x², d/dx(4x²)=8x, d/dx(-2x)=-2, d/dx(7)=0.", isCorrect: true },
      { label: 'C', text: '3x² + 8x − 2 + 7', justification: 'The constant 7 differentiates to 0, not 7.', isCorrect: false },
      { label: 'D', text: '3x² + 4x − 2', justification: 'The derivative of 4x² is 8x (not 4x); the coefficient doubles.', isCorrect: false },
    ],
  },
  {
    moduleKey: 'MAT137_Winter 2025::Differentiation & Integration',
    externalQuestionId: 'MAT137-DI-002',
    bloom: 'UNDERSTAND',
    stem: 'What does the Fundamental Theorem of Calculus (Part 2) state?',
    reference: 'Spivak, Calculus, 4th Ed., Ch. 14',
    irtA: 1.05, irtB: 0.0, irtC: 0.20,
    options: [
      { label: 'A', text: 'Every continuous function has an antiderivative', justification: 'That is Part 1 of FTC; Part 2 connects definite integrals to antiderivatives.', isCorrect: false },
      { label: 'B', text: 'If F is an antiderivative of f on [a,b], then ∫ₐᵇ f(x)dx = F(b) − F(a)', justification: 'FTC Part 2 allows evaluation of definite integrals using any antiderivative: subtract boundary values.', isCorrect: true },
      { label: 'C', text: 'The derivative of ∫ₐˣ f(t)dt equals f(x)', justification: "That is FTC Part 1, which connects the integral to differentiation.", isCorrect: false },
      { label: 'D', text: 'Every differentiable function is integrable', justification: 'While true, this is not what FTC Part 2 states.', isCorrect: false },
    ],
  },
]
