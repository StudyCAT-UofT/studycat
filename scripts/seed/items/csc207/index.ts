import type { ItemDef } from '../../types'

export const CSC207_ITEMS: ItemDef[] = [
  // ─── CSC207: Software Design (Fall 2024) ──────────────────────────────────────
  // Object-Oriented Design
  {
    moduleKey: 'CSC207_Fall 2024::Object-Oriented Design',
    externalQuestionId: 'CSC207-OD-001',
    bloom: 'REMEMBER',
    stem: 'Which OOP principle states that a class should expose only what is necessary and hide implementation details?',
    reference: 'Bloch, Effective Java, 3rd Ed.',
    irtA: 0.80, irtB: -1.0, irtC: 0.22,
    options: [
      { label: 'A', text: 'Inheritance', justification: 'Inheritance is about extending classes, not hiding details.', isCorrect: false },
      { label: 'B', text: 'Encapsulation', justification: 'Encapsulation bundles data and methods while restricting external access to internals.', isCorrect: true },
      { label: 'C', text: 'Polymorphism', justification: 'Polymorphism allows objects to be treated as instances of a parent type.', isCorrect: false },
      { label: 'D', text: 'Abstraction', justification: 'Abstraction is related but refers more broadly to hiding complexity behind interfaces.', isCorrect: false },
    ],
  },
  {
    moduleKey: 'CSC207_Fall 2024::Object-Oriented Design',
    externalQuestionId: 'CSC207-OD-002',
    bloom: 'UNDERSTAND',
    stem: 'What does the Liskov Substitution Principle (LSP) state?',
    reference: 'Bloch, Effective Java, 3rd Ed.',
    irtA: 1.10, irtB: 0.3, irtC: 0.19,
    options: [
      { label: 'A', text: 'A class should have only one reason to change', justification: 'That is the Single Responsibility Principle.', isCorrect: false },
      { label: 'B', text: 'Subtypes must be substitutable for their base types without altering program correctness', justification: 'LSP requires that objects of a subclass can replace objects of the superclass without breaking the program.', isCorrect: true },
      { label: 'C', text: 'Classes should be open for extension but closed for modification', justification: 'That is the Open/Closed Principle.', isCorrect: false },
      { label: 'D', text: 'Depend on abstractions, not concretions', justification: 'That is the Dependency Inversion Principle.', isCorrect: false },
    ],
  },
  // Design Patterns
  {
    moduleKey: 'CSC207_Fall 2024::Design Patterns',
    externalQuestionId: 'CSC207-DP-001',
    bloom: 'REMEMBER',
    stem: 'The Singleton pattern ensures that a class has how many instances?',
    reference: 'Gamma et al., Design Patterns, Ch. 3',
    irtA: 0.75, irtB: -1.1, irtC: 0.23,
    options: [
      { label: 'A', text: 'Zero', justification: 'Singleton ensures at least one instance exists.', isCorrect: false },
      { label: 'B', text: 'Exactly one', justification: 'The Singleton pattern restricts instantiation to a single object and provides a global access point.', isCorrect: true },
      { label: 'C', text: 'Two', justification: 'Two instances would violate the Singleton constraint.', isCorrect: false },
      { label: 'D', text: 'Unlimited', justification: 'Unlimited instances is the default behavior without the Singleton pattern.', isCorrect: false },
    ],
  },
  {
    moduleKey: 'CSC207_Fall 2024::Design Patterns',
    externalQuestionId: 'CSC207-DP-002',
    bloom: 'UNDERSTAND',
    stem: 'In the Observer pattern, what is the relationship between Subject and Observer?',
    reference: 'Gamma et al., Design Patterns, Ch. 5',
    irtA: 1.05, irtB: 0.1, irtC: 0.20,
    options: [
      { label: 'A', text: 'Observer inherits from Subject', justification: 'Observer and Subject are not in an inheritance relationship; they communicate via a registration/notification interface.', isCorrect: false },
      { label: 'B', text: 'Subject maintains a list of Observers and notifies them of state changes', justification: 'The Subject (publisher) holds references to Observers (subscribers) and calls their update method when its state changes.', isCorrect: true },
      { label: 'C', text: 'Observer creates and destroys Subject instances', justification: 'Observers react to Subject changes; they do not manage Subject lifecycle.', isCorrect: false },
      { label: 'D', text: 'Subject and Observer share the same interface', justification: 'They have separate roles; Subject notifies, Observer reacts.', isCorrect: false },
    ],
  },
  // Testing & Refactoring
  {
    moduleKey: 'CSC207_Fall 2024::Testing & Refactoring',
    externalQuestionId: 'CSC207-TR-001',
    bloom: 'REMEMBER',
    stem: 'In test-driven development (TDD), what is the correct order of steps?',
    reference: 'Beck, Test-Driven Development by Example',
    irtA: 0.82, irtB: -0.9, irtC: 0.21,
    options: [
      { label: 'A', text: 'Write code → Write test → Refactor', justification: 'TDD requires writing the failing test before writing any production code.', isCorrect: false },
      { label: 'B', text: 'Write failing test → Write minimal code to pass → Refactor', justification: 'Red–Green–Refactor: first write a failing test (red), then write minimal code to pass it (green), then clean up (refactor).', isCorrect: true },
      { label: 'C', text: 'Refactor → Write test → Write code', justification: 'Refactoring comes last in TDD, not first.', isCorrect: false },
      { label: 'D', text: 'Write test → Refactor → Write code', justification: 'Refactoring must happen after code passes; writing code comes before refactoring.', isCorrect: false },
    ],
  },
  {
    moduleKey: 'CSC207_Fall 2024::Testing & Refactoring',
    externalQuestionId: 'CSC207-TR-002',
    bloom: 'UNDERSTAND',
    stem: 'What is a "code smell" in software engineering?',
    reference: 'Fowler, Refactoring, 2nd Ed.',
    irtA: 0.95, irtB: -0.2, irtC: 0.20,
    options: [
      { label: 'A', text: 'A runtime error caused by bad memory management', justification: 'Code smells are structural issues in code, not runtime errors.', isCorrect: false },
      { label: 'B', text: 'A surface indicator in source code that may signal a deeper design problem', justification: 'Code smells (e.g., long methods, duplicate code, large classes) are symptoms of potential design flaws that warrant refactoring.', isCorrect: true },
      { label: 'C', text: 'A security vulnerability found by static analysis', justification: 'Security vulnerabilities are a separate concern from code smells, though bad code can enable both.', isCorrect: false },
      { label: 'D', text: 'A performance bottleneck detected by a profiler', justification: 'Performance issues are identified by profiling; code smells are structural/design concerns.', isCorrect: false },
    ],
  },
]
