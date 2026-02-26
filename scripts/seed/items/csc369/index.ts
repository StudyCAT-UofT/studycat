import type { ItemDef } from '../../types'

export const CSC369_ITEMS: ItemDef[] = [
  // ─── CSC369: Operating Systems (Fall 2024) ────────────────────────────────────
  {
    moduleKey: 'CSC369_Fall 2024::Processes & Threads',
    externalQuestionId: 'CSC369-PT-001',
    bloom: 'REMEMBER',
    stem: 'What is the difference between a process and a thread?',
    reference: 'Silberschatz, Operating System Concepts, 10th Ed.',
    irtA: 0.85, irtB: -0.8, irtC: 0.21,
    options: [
      { label: 'A', text: 'A thread has its own memory space; a process shares memory with others', justification: 'This is reversed: processes have separate memory; threads share memory within a process.', isCorrect: false },
      { label: 'B', text: 'A process has its own memory space; threads within a process share memory', justification: 'Processes are isolated; threads are lightweight execution units that share the heap and global data of their parent process.', isCorrect: true },
      { label: 'C', text: 'Processes and threads are identical in modern operating systems', justification: 'They differ in isolation, overhead, and memory sharing.', isCorrect: false },
      { label: 'D', text: 'A thread can run on multiple CPUs simultaneously; a process cannot', justification: 'Both processes and threads can be scheduled across CPUs; threads of the same process share memory.', isCorrect: false },
    ],
  },
  {
    moduleKey: 'CSC369_Fall 2024::Processes & Threads',
    externalQuestionId: 'CSC369-PT-002',
    bloom: 'UNDERSTAND',
    stem: 'What is a race condition?',
    reference: 'Silberschatz, Operating System Concepts, 10th Ed.',
    irtA: 1.00, irtB: -0.2, irtC: 0.20,
    options: [
      { label: 'A', text: 'A CPU scheduling algorithm that prioritizes fast processes', justification: 'This describes a scheduling policy, not a race condition.', isCorrect: false },
      { label: 'B', text: 'A situation where the outcome depends on the non-deterministic ordering of concurrent operations accessing shared data', justification: 'A race condition occurs when two or more threads access shared data concurrently and the result depends on the order of execution.', isCorrect: true },
      { label: 'C', text: 'A deadlock between exactly two threads', justification: 'Deadlock is a separate problem; race conditions involve unpredictable outcomes, not necessarily blocking.', isCorrect: false },
      { label: 'D', text: 'An OS scheduler bug that skips a process indefinitely', justification: 'That describes starvation, not a race condition.', isCorrect: false },
    ],
  },
  {
    moduleKey: 'CSC369_Fall 2024::Memory Management',
    externalQuestionId: 'CSC369-MM-001',
    bloom: 'REMEMBER',
    stem: 'What is the purpose of a Translation Lookaside Buffer (TLB)?',
    reference: 'Silberschatz, Operating System Concepts, 10th Ed.',
    irtA: 0.88, irtB: -0.7, irtC: 0.21,
    options: [
      { label: 'A', text: 'To store recently used disk blocks in RAM', justification: 'That describes a disk buffer cache, not a TLB.', isCorrect: false },
      { label: 'B', text: 'To cache recent virtual-to-physical address translations for fast memory access', justification: 'The TLB is a hardware cache that stores page table entries, avoiding a full page table walk on every memory access.', isCorrect: true },
      { label: 'C', text: 'To manage the swap space on disk', justification: 'Swap management is handled by the OS, not the TLB.', isCorrect: false },
      { label: 'D', text: 'To enforce memory protection between processes', justification: 'Memory protection uses page table permission bits; the TLB speeds up address translation.', isCorrect: false },
    ],
  },
  {
    moduleKey: 'CSC369_Fall 2024::Memory Management',
    externalQuestionId: 'CSC369-MM-002',
    bloom: 'ANALYZE',
    stem: 'In the LRU page replacement algorithm, which page is evicted on a page fault?',
    reference: 'Silberschatz, Operating System Concepts, 10th Ed.',
    irtA: 1.05, irtB: 0.2, irtC: 0.19,
    options: [
      { label: 'A', text: 'The page that will not be used for the longest time in the future', justification: 'That is the optimal (OPT) algorithm, which requires future knowledge.', isCorrect: false },
      { label: 'B', text: 'The page that has not been used for the longest time in the past', justification: 'LRU (Least Recently Used) evicts the page whose most recent access is furthest in the past.', isCorrect: true },
      { label: 'C', text: 'The page that was loaded first into memory', justification: 'That is the FIFO algorithm, not LRU.', isCorrect: false },
      { label: 'D', text: 'A randomly selected page', justification: 'That is the random replacement algorithm, not LRU.', isCorrect: false },
    ],
  },
]
