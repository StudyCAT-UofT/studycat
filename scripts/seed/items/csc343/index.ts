import type { ItemDef } from '../../types'

export const CSC343_ITEMS: ItemDef[] = [
  // ─── CSC343: Introduction to Databases (Winter 2025) ──────────────────────────
  // Relational Model & SQL
  {
    moduleKey: 'CSC343_Winter 2025::Relational Model & SQL',
    externalQuestionId: 'CSC343-SQL-001',
    bloom: 'REMEMBER',
    stem: 'Which SQL keyword removes duplicate rows from a query result?',
    reference: 'Ramakrishnan & Gehrke, Database Management Systems, 3rd Ed.',
    irtA: 0.78, irtB: -1.0, irtC: 0.22,
    options: [
      { label: 'A', text: 'UNIQUE', justification: 'UNIQUE is a constraint, not a query keyword for removing duplicates.', isCorrect: false },
      { label: 'B', text: 'DISTINCT', justification: 'SELECT DISTINCT eliminates duplicate rows from the result set.', isCorrect: true },
      { label: 'C', text: 'FILTER', justification: 'FILTER is not standard SQL for removing duplicates.', isCorrect: false },
      { label: 'D', text: 'GROUP BY', justification: 'GROUP BY groups rows but does not by itself remove duplicates from ungrouped queries.', isCorrect: false },
    ],
  },
  {
    moduleKey: 'CSC343_Winter 2025::Relational Model & SQL',
    externalQuestionId: 'CSC343-SQL-002',
    bloom: 'APPLY',
    stem: 'Which SQL clause filters groups after a GROUP BY, rather than filtering individual rows?',
    reference: 'Ramakrishnan & Gehrke, Database Management Systems, 3rd Ed.',
    irtA: 1.10, irtB: 0.2, irtC: 0.19,
    options: [
      { label: 'A', text: 'WHERE', justification: 'WHERE filters individual rows before grouping.', isCorrect: false },
      { label: 'B', text: 'HAVING', justification: 'HAVING applies conditions to groups after GROUP BY, e.g., HAVING COUNT(*) > 5.', isCorrect: true },
      { label: 'C', text: 'ORDER BY', justification: 'ORDER BY sorts the result; it does not filter groups.', isCorrect: false },
      { label: 'D', text: 'LIMIT', justification: 'LIMIT restricts the number of rows returned, not group-level filtering.', isCorrect: false },
    ],
  },
  // Query Optimization
  {
    moduleKey: 'CSC343_Winter 2025::Query Optimization',
    externalQuestionId: 'CSC343-QO-001',
    bloom: 'UNDERSTAND',
    stem: 'What is the primary purpose of a database index?',
    reference: 'Ramakrishnan & Gehrke, Database Management Systems, 3rd Ed.',
    irtA: 0.90, irtB: -0.5, irtC: 0.21,
    options: [
      { label: 'A', text: 'To enforce referential integrity between tables', justification: 'Referential integrity is enforced by foreign key constraints, not indexes.', isCorrect: false },
      { label: 'B', text: 'To speed up data retrieval by providing a fast lookup structure', justification: 'An index (e.g., B-tree) allows the database to locate rows without scanning the entire table.', isCorrect: true },
      { label: 'C', text: 'To compress data to reduce storage size', justification: 'Indexes actually consume additional storage; their purpose is retrieval speed, not compression.', isCorrect: false },
      { label: 'D', text: 'To automatically sort query results', justification: 'Indexes can support ordered scans but do not automatically sort results without an ORDER BY clause.', isCorrect: false },
    ],
  },
  {
    moduleKey: 'CSC343_Winter 2025::Query Optimization',
    externalQuestionId: 'CSC343-QO-002',
    bloom: 'ANALYZE',
    stem: 'A table has 1 million rows. A query filters on an unindexed column. What is the typical access pattern?',
    reference: 'Ramakrishnan & Gehrke, Database Management Systems, 3rd Ed.',
    irtA: 1.20, irtB: 0.5, irtC: 0.19,
    options: [
      { label: 'A', text: 'Index scan — only relevant rows are read', justification: 'Without an index, an index scan is not possible.', isCorrect: false },
      { label: 'B', text: 'Full table scan — every row must be examined', justification: 'Without an index, the database reads every row to find those matching the predicate (O(n) cost).', isCorrect: true },
      { label: 'C', text: 'Hash join — rows are hashed and compared', justification: 'Hash join is used for join operations between two tables, not single-table lookups.', isCorrect: false },
      { label: 'D', text: 'Bitmap scan — a bitmap marks matching rows', justification: 'Bitmap scans require an index; without one, a full scan is performed.', isCorrect: false },
    ],
  },
  // Transactions & Concurrency
  {
    moduleKey: 'CSC343_Winter 2025::Transactions & Concurrency',
    externalQuestionId: 'CSC343-TC-001',
    bloom: 'REMEMBER',
    stem: 'What does the "A" in ACID stand for?',
    reference: 'Ramakrishnan & Gehrke, Database Management Systems, 3rd Ed.',
    irtA: 0.72, irtB: -1.2, irtC: 0.23,
    options: [
      { label: 'A', text: 'Authorization', justification: 'Authorization relates to access control, not ACID properties.', isCorrect: false },
      { label: 'B', text: 'Atomicity', justification: 'Atomicity means a transaction is all-or-nothing: either all operations complete or none do.', isCorrect: true },
      { label: 'C', text: 'Availability', justification: 'Availability is a property in the CAP theorem, not ACID.', isCorrect: false },
      { label: 'D', text: 'Aggregation', justification: 'Aggregation is a SQL concept unrelated to ACID.', isCorrect: false },
    ],
  },
  {
    moduleKey: 'CSC343_Winter 2025::Transactions & Concurrency',
    externalQuestionId: 'CSC343-TC-002',
    bloom: 'UNDERSTAND',
    stem: 'What is a deadlock in a database system?',
    reference: 'Ramakrishnan & Gehrke, Database Management Systems, 3rd Ed.',
    irtA: 1.00, irtB: 0.0, irtC: 0.20,
    options: [
      { label: 'A', text: 'A transaction that runs for too long and is automatically rolled back', justification: 'That describes a timeout or long-running transaction, not a deadlock.', isCorrect: false },
      { label: 'B', text: 'A cycle of transactions each waiting for a lock held by another, causing all to be stuck indefinitely', justification: 'Deadlock: T1 holds lock A and waits for B; T2 holds B and waits for A — neither can proceed.', isCorrect: true },
      { label: 'C', text: 'A transaction that corrupts data due to a write conflict', justification: 'Data corruption from write conflicts is a concurrency anomaly, not necessarily a deadlock.', isCorrect: false },
      { label: 'D', text: 'A database that runs out of storage space', justification: 'Storage exhaustion is an operational issue unrelated to transaction deadlocks.', isCorrect: false },
    ],
  },
]
