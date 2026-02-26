import type { ItemDef } from '../../types'

export const CSC373_ITEMS: ItemDef[] = [
  // ─── CSC373: Algorithm Design & Analysis (Winter 2025) ────────────────────────
  {
    moduleKey: 'CSC373_Winter 2025::Greedy & Divide-and-Conquer',
    externalQuestionId: 'CSC373-GD-001',
    bloom: 'REMEMBER',
    stem: 'What is the time complexity of merge sort in the worst case?',
    reference: 'Kleinberg & Tardos, Algorithm Design, Ch. 5',
    irtA: 0.82, irtB: -0.9, irtC: 0.22,
    options: [
      { label: 'A', text: 'O(n²)', justification: 'O(n²) is the worst-case for bubble/insertion/selection sort, not merge sort.', isCorrect: false },
      { label: 'B', text: 'O(n log n)', justification: 'Merge sort divides the array in half at each level (log n levels) and merges in O(n) per level: T(n) = 2T(n/2) + O(n) → O(n log n).', isCorrect: true },
      { label: 'C', text: 'O(n)', justification: 'O(n) linear sort requires special conditions (e.g., counting sort); general comparison sort cannot do better than O(n log n).', isCorrect: false },
      { label: 'D', text: 'O(log n)', justification: 'O(log n) describes binary search, not a sorting algorithm.', isCorrect: false },
    ],
  },
  {
    moduleKey: 'CSC373_Winter 2025::Greedy & Divide-and-Conquer',
    externalQuestionId: 'CSC373-GD-002',
    bloom: 'UNDERSTAND',
    stem: 'A greedy algorithm makes locally optimal choices at each step. When does this guarantee a globally optimal solution?',
    reference: 'Kleinberg & Tardos, Algorithm Design, Ch. 4',
    irtA: 1.15, irtB: 0.3, irtC: 0.19,
    options: [
      { label: 'A', text: 'Always — greedy algorithms always find the global optimum', justification: 'Greedy algorithms only guarantee optimality when the problem exhibits the greedy-choice property and optimal substructure.', isCorrect: false },
      { label: 'B', text: 'When the problem exhibits the greedy-choice property and optimal substructure', justification: 'If locally optimal choices lead to a globally optimal solution (greedy-choice property) and subproblems are independent (optimal substructure), greedy works.', isCorrect: true },
      { label: 'C', text: 'Never — greedy algorithms only give approximate solutions', justification: 'Many problems (interval scheduling, Huffman coding, Dijkstra) are solved optimally by greedy algorithms.', isCorrect: false },
      { label: 'D', text: 'Only when the input is already sorted', justification: 'Sorted input is sometimes required for efficiency but is not the condition for correctness of greedy algorithms.', isCorrect: false },
    ],
  },
  {
    moduleKey: 'CSC373_Winter 2025::Dynamic Programming & NP-Completeness',
    externalQuestionId: 'CSC373-DP-001',
    bloom: 'UNDERSTAND',
    stem: 'What is the key difference between memoization and bottom-up dynamic programming?',
    reference: 'Kleinberg & Tardos, Algorithm Design, Ch. 6',
    irtA: 1.05, irtB: 0.1, irtC: 0.20,
    options: [
      { label: 'A', text: 'Memoization uses iteration; bottom-up uses recursion', justification: 'This is reversed: memoization uses recursion with caching; bottom-up uses iteration.', isCorrect: false },
      { label: 'B', text: 'Memoization is top-down (recursive + cache); bottom-up iteratively fills a table from smaller subproblems', justification: 'Both avoid redundant computation, but memoization caches recursive calls while bottom-up systematically solves subproblems in order.', isCorrect: true },
      { label: 'C', text: 'Bottom-up always uses more memory than memoization', justification: 'Bottom-up often uses less memory because only necessary table entries are stored; memoization may cache more.', isCorrect: false },
      { label: 'D', text: 'They produce different results for the same problem', justification: 'Both compute the same result; they differ only in implementation style.', isCorrect: false },
    ],
  },
  {
    moduleKey: 'CSC373_Winter 2025::Dynamic Programming & NP-Completeness',
    externalQuestionId: 'CSC373-DP-002',
    bloom: 'REMEMBER',
    stem: 'If problem A is NP-complete and A reduces to problem B in polynomial time, what can we conclude about B?',
    reference: 'Kleinberg & Tardos, Algorithm Design, Ch. 8',
    irtA: 1.20, irtB: 0.5, irtC: 0.19,
    options: [
      { label: 'A', text: 'B is in P', justification: 'We cannot conclude B is in P; the reduction shows B is at least as hard as A.', isCorrect: false },
      { label: 'B', text: 'B is NP-hard (at least as hard as any NP problem)', justification: 'If an NP-complete problem reduces to B, then B is NP-hard: solving B efficiently would solve all NP problems efficiently.', isCorrect: true },
      { label: 'C', text: 'B is easier than A', justification: 'A polynomial reduction from A to B means B is at least as hard as A, not easier.', isCorrect: false },
      { label: 'D', text: 'Nothing can be concluded about B', justification: 'The reduction implies B is NP-hard; definite conclusions can be drawn.', isCorrect: false },
    ],
  },
]
