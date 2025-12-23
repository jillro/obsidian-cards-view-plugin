import { describe, test } from "node:test";
import assert from "assert";
import { extractPreviewContent } from "./previewContent";

describe("extractPreviewContent", async () => {
  await describe("table handling", async () => {
    await test("includes at least 10 lines of table regardless of char limit", () => {
      const content = `# Header

Some intro text.

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Row 1    | Data 1   | Value 1  |
| Row 2    | Data 2   | Value 2  |
| Row 3    | Data 3   | Value 3  |
| Row 4    | Data 4   | Value 4  |
| Row 5    | Data 5   | Value 5  |
| Row 6    | Data 6   | Value 6  |
| Row 7    | Data 7   | Value 7  |
| Row 8    | Data 8   | Value 8  |
| Row 9    | Data 9   | Value 9  |
| Row 10   | Data 10  | Value 10 |
| Row 11   | Data 11  | Value 11 |
| Row 12   | Data 12  | Value 12 |

More text after table.`;

      // Use a char limit that cuts off inside the table (after ~5 rows)
      const result = extractPreviewContent(content, 200);

      // Count table lines in result (lines with |)
      const tableLines = result.split("\n").filter((line) => line.includes("|"));

      // Should have at least 10 table lines (header + separator + 8+ data rows)
      assert.ok(
        tableLines.length >= 10,
        `Expected at least 10 table lines, got ${tableLines.length}`,
      );
    });

    await test("preserves full table when less than 10 lines", () => {
      const content = `# Header

| Column 1 | Column 2 |
|----------|----------|
| Row 1    | Data 1   |
| Row 2    | Data 2   |
| Row 3    | Data 3   |

More text after.`;

      const result = extractPreviewContent(content, 150);

      // Should include all table lines
      const tableLines = result.split("\n").filter((line) => line.includes("|"));
      assert.equal(tableLines.length, 5); // header + separator + 3 rows
    });

    await test("handles table at start of content", () => {
      const content = `| Column 1 | Column 2 |
|----------|----------|
| Row 1    | Data 1   |
| Row 2    | Data 2   |
| Row 3    | Data 3   |
| Row 4    | Data 4   |
| Row 5    | Data 5   |
| Row 6    | Data 6   |
| Row 7    | Data 7   |
| Row 8    | Data 8   |
| Row 9    | Data 9   |
| Row 10   | Data 10  |
| Row 11   | Data 11  |

Text after table.`;

      const result = extractPreviewContent(content, 100);
      const tableLines = result.split("\n").filter((line) => line.includes("|"));

      assert.ok(
        tableLines.length >= 10,
        `Expected at least 10 table lines, got ${tableLines.length}`,
      );
    });

    await test("does not extend beyond table end", () => {
      const content = `# Header

| Column 1 | Column 2 |
|----------|----------|
| Row 1    | Data 1   |
| Row 2    | Data 2   |

This should not be included in table extension.`;

      const result = extractPreviewContent(content, 100);

      // Should not include the text after the table when extending
      assert.ok(!result.includes("This should not be included"));
    });

    await test("handles content without tables normally", () => {
      const content = `# Header

This is some regular content without any tables.
It should be truncated normally.

More paragraphs here.
And more text.`;

      const result = extractPreviewContent(content, 50);

      // Should truncate normally without table logic interfering
      assert.ok(result.length <= 100); // Should be reasonably short
      assert.ok(!result.includes("More paragraphs")); // Should be truncated
    });

    await test("handles empty content", () => {
      const result = extractPreviewContent("", 100);
      assert.equal(result, "");
    });

    await test("skips YAML frontmatter", () => {
      const content = `---
title: Test
tags: [test]
---

| Column 1 | Column 2 |
|----------|----------|
| Row 1    | Data 1   |`;

      const result = extractPreviewContent(content, 100);

      // Should not include frontmatter
      assert.ok(!result.includes("title: Test"));
      assert.ok(!result.includes("tags: [test]"));

      // Should include table
      assert.ok(result.includes("Column 1"));
    });

    await test("handles tables with different formatting", () => {
      const content = `# Header

| Left | Center | Right |
|:-----|:------:|------:|
| L1   |   C1   |    R1 |
| L2   |   C2   |    R2 |
| L3   |   C3   |    R3 |
| L4   |   C4   |    R4 |
| L5   |   C5   |    R5 |
| L6   |   C6   |    R6 |
| L7   |   C7   |    R7 |
| L8   |   C8   |    R8 |
| L9   |   C9   |    R9 |
| L10  |  C10   |   R10 |
| L11  |  C11   |   R11 |`;

      const result = extractPreviewContent(content, 150);
      const tableLines = result.split("\n").filter((line) => line.includes("|"));

      assert.ok(
        tableLines.length >= 10,
        `Expected at least 10 table lines, got ${tableLines.length}`,
      );
    });
  });
});