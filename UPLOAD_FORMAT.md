# Question Spreadsheet Upload Format

This document describes the expected format for the spreadsheet file used to import questions via the **Upload** page (`/upload`) or the `POST /api/upload` endpoint.

## Supported File Types

- `.xlsx` (Excel workbook)
- `.csv` (comma-separated values)

> Only the **first sheet** of an Excel workbook is processed. Column headers are **case-insensitive** and leading/trailing whitespace is ignored.

---

## Columns Reference

### Required Columns

| Column | Description |
|--------|-------------|
| `lecture` | The module (topic) this question belongs to. If a module with this name does not yet exist for the course, one is **automatically created**. |
| `question_id` | A unique identifier for the question within the course (e.g. `L01-Q01`). If a question with this ID already exists for the course, the row is **skipped** (not an error). |
| `category` | Bloom's Taxonomy level. See [Bloom Category Values](#bloom-category-values) below. |
| `question` | The full question stem (text of the question). |
| `correct_answer` | The letter of the correct option (e.g. `A`, `B`, `C`). Only a **single correct answer** is supported via upload. |
| `answer_a` | Text for answer option A. |
| `answer_b` | Text for answer option B. |

> At least two answer options (`answer_a` and `answer_b`) are required. Options are detected in alphabetical order (A → B → C → …) and stop at the first missing/blank column.

---

### Optional Answer Columns

| Column | Description |
|--------|-------------|
| `answer_c`, `answer_d`, … | Additional answer options. Up to 26 options (A–Z) are supported. |
| `answer_justification_a`, `answer_justification_b`, … | Explanation shown to the student after answering, for each option. One justification column per answer option. |

---

### Optional Question Metadata

| Column | Description | Default |
|--------|-------------|---------|
| `question_figure` | URL or path to an image displayed with the question. | `null` |
| `reference` | Source reference (e.g. textbook chapter, lecture slide number). | `null` |
| `status` | Set to `inactive` to import the question as inactive. Any other value (or absent) is treated as `active`. | `active` |

---

### Unsupported Columns (known limitations)

| Column | Status |
|--------|--------|
| `answer_figure`, … | **Not yet supported.** Answer-supporting image is recognised in the source but not stored. Including this column will not cause an error — they are silently ignored. See GitHub issue #68. |

---

### Optional IRT Parameters

These columns allow you to supply pre-calibrated IRT parameters. If omitted or blank, StudyCAT applies defaults (see [IRT_Help.md](IRT_Help.md#default-parameter-values-in-studycat) for details).

| Column | IRT Parameter | Default |
|--------|--------------|---------|
| `irt_a` | Discrimination (`a`) | `1.0` |
| `irt_b` | Difficulty (`b`) | `0.0` |
| `irt_c` | Guessing (`c`) | `1 / number of options` |

---

### Optional Historical Statistics

These columns store pre-existing statistics from a previous question bank. They are stored as-is and are not computed by StudyCAT.

| Column | Description |
|--------|-------------|
| `biserial` | Point-biserial correlation coefficient (discrimination statistic). |
| `average` | Historical percentage of students who answered correctly. |
| `attempts` | Historical total number of attempts for this question. |

---

## Bloom Category Values

The `category` column accepts both full names and abbreviations. Matching is case-insensitive.

| Full Name | Accepted Abbreviation (prefix) | Stored Value |
|-----------|-------------------------------|--------------|
| Remember | `REC` | `REMEMBER` |
| Understand | `UND` | `UNDERSTAND` |
| Apply | `APP` | `APPLY` |
| Analyze | `ANA` | `ANALYZE` |
| Evaluate | `EVA` | `EVALUATE` |
| Create | `CRE` | `CREATE` |

Examples of accepted values: `REMEMBER`, `remember`, `Rec`, `REC`, `UND`, `understand`.

Rows with a missing or unrecognised `category` value are **skipped**.

---

## Import Behaviour

| Situation | Result |
|-----------|--------|
| Missing `lecture` or `question_id` | Row skipped |
| Invalid or missing `category` | Row skipped |
| No answer options found | Row skipped |
| `question_id` already exists for this course and data has changed | Question and its options are updated in-place (row status: `updated`) |
| `question_id` already exists for this course and nothing has changed | Row skipped (row status: `unchanged`) |
| `question_id` not in this course | New question created (row status: `created`) |
| Module name does not exist | Module is automatically created |
| Question not present in the file and `deactivateMissing` is set | Question deactivated (row status: `deactivated`) |
| Unexpected error on a single row | Row status: `error` (other rows continue) |

The API response includes a `details` array with the status of each row, making it easy to identify which rows were skipped, updated, or failed.

---

## Advanced: Dry-Run / Two-Phase Commit

The upload endpoint supports an optional two-phase flow designed for the Upload UI, where users can preview changes before committing them.

### Form Fields

In addition to `file`, `courseId`, and `offeringId`, the following optional form fields control upload behaviour:

| Field | Type | Description |
|-------|------|-------------|
| `dryRun` | `"true"` | Preview all changes (creates, updates, deactivations) without writing to the database. The response `details` array will include `diff` objects for rows that would be updated. |
| `deactivateMissing` | `"true"` | After processing all rows, deactivate any currently-active questions in this course whose `question_id` was **not** present in the uploaded file. |
| `approvedQuestionIds` | JSON array of strings | Commit step only: restrict row processing to only the listed `question_id` values. Rows not in the list are skipped (status: `skipped: not approved`). |
| `deactivateIds` | JSON array of DB item IDs | Commit step only: deactivate the listed item IDs (by database `id`, not `question_id`). Used to apply deactivations that were previewed in a prior dry run. |

### Typical Two-Phase Flow

1. **Dry run:** Send the file with `dryRun=true` (and optionally `deactivateMissing=true`). Inspect the `details` array to see what would be created, updated, or deactivated.
2. **Commit:** Select the changes to apply. Re-send with `approvedQuestionIds` containing the IDs to create/update and `deactivateIds` containing the DB IDs of items to deactivate. Omit `dryRun` (or set it to `false`) to write to the database.

---

## Example Spreadsheet

| lecture | question_id | category | question | correct_answer | answer_a | answer_b | answer_c | answer_d | answer_justification_a | answer_justification_b | irt_a | irt_b | irt_c |
|---------|-------------|----------|----------|----------------|----------|----------|----------|----------|------------------------|------------------------|-------|-------|-------|
| Week 1 – Variables | L01-Q01 | REC | What is a variable? | B | A container for functions | A named storage location for data | A loop construct | A conditional statement | Functions are separate constructs | Correct — variables store values | 1.2 | -0.5 | 0.25 |
| Week 1 – Variables | L01-Q02 | UND | Which of the following is a valid variable name in Python? | C | 1name | my-var | my_var | class | Cannot start with a digit | Hyphens are not allowed | 0.9 | 0.3 | 0.25 |
| Week 2 – Loops | L02-Q01 | APP | What does the following loop print? | A | 0 1 2 3 4 | 1 2 3 4 5 | 0 1 2 3 | 1 2 3 4 | | | | | |

> **Tip:** You do not need to include the IRT parameter or justification columns if you do not have that data. Simply omit those columns entirely.
