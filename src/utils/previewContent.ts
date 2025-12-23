/**
 * Extracts preview content from markdown, optimized for card display.
 * Truncates content at a safe boundary while preserving valid markdown syntax.
 */

/**
 * Extracts a preview of the markdown content for efficient card rendering.
 *
 * @param content - Full markdown content from the file
 * @param charLimit - Maximum number of characters to extract (default: 700)
 * @returns Truncated content ready for markdown rendering
 */
export function extractPreviewContent(
  content: string,
  charLimit: number = 1200,
): string {
  if (!content || content.length === 0) {
    return "";
  }

  // Skip YAML frontmatter if present
  let startIndex = 0;
  if (content.startsWith("---")) {
    const frontmatterEnd = content.indexOf("\n---", 3);
    if (frontmatterEnd !== -1) {
      // Skip past the closing --- and newline
      startIndex = frontmatterEnd + 4;
    }
  }

  // If content after frontmatter is empty or very short, return it as-is
  const contentAfterFrontmatter = content.slice(startIndex);
  if (contentAfterFrontmatter.length <= charLimit) {
    return contentAfterFrontmatter.trim();
  }

  // Extract up to charLimit characters
  let truncated = contentAfterFrontmatter.slice(0, charLimit);

  // Find a safe truncation point
  truncated = findSafeTruncationPoint(truncated);

  // If we're inside a table, ensure at least 10 lines of the table are included
  truncated = ensureMinTableLines(truncated, contentAfterFrontmatter);

  // Check if we're inside a code block and close it if needed
  truncated = closeUnclosedCodeBlocks(truncated);

  // Add ellipsis if we actually truncated content
  if (startIndex + truncated.length < content.length) {
    truncated = truncated.trimEnd() + " ...";
  }

  return truncated.trim();
}

/**
 * Finds a safe place to truncate content (word or sentence boundary).
 * Prioritizes: sentence end > paragraph end > word boundary > char limit
 */
function findSafeTruncationPoint(text: string): string {
  // Try to find the last sentence ending within the last 100 chars
  const sentencePattern = /[.!?]\s/g;
  let lastSentenceEnd = -1;
  let match;

  while ((match = sentencePattern.exec(text)) !== null) {
    lastSentenceEnd = match.index + 1; // Include the punctuation
  }

  // If we found a sentence ending in the last 100 chars, use it
  if (lastSentenceEnd > text.length - 100 && lastSentenceEnd > 0) {
    return text.slice(0, lastSentenceEnd);
  }

  // Try to find the last double newline (paragraph boundary)
  const lastParagraph = text.lastIndexOf("\n\n");
  if (lastParagraph > text.length - 100 && lastParagraph > 0) {
    return text.slice(0, lastParagraph);
  }

  // Fall back to last word boundary (space or newline)
  const lastSpace = Math.max(text.lastIndexOf(" "), text.lastIndexOf("\n"));

  if (lastSpace > text.length - 50 && lastSpace > 0) {
    return text.slice(0, lastSpace);
  }

  // If no good boundary found, just use the full text
  return text;
}

/**
 * Ensures that if we're truncating inside a table, at least 10 lines of the table are included.
 * @param truncated - The currently truncated content
 * @param fullContent - The full content to potentially extend from
 * @returns Extended content if inside a table with fewer than 10 lines, otherwise original truncated content
 */
function ensureMinTableLines(truncated: string, fullContent: string): string {
  const MIN_TABLE_LINES = 10;

  // Find the last table in the truncated content
  const truncatedLines = truncated.split("\n");
  let lastTableEndIndex = -1;
  let tableStartIndex = -1;

  // Scan backwards to find if we're inside a table
  for (let i = truncatedLines.length - 1; i >= 0; i--) {
    const line = truncatedLines[i].trim();
    // Table rows contain pipes (|)
    if (line.includes("|")) {
      if (lastTableEndIndex === -1) {
        lastTableEndIndex = i;
      }
      tableStartIndex = i;
    } else if (lastTableEndIndex !== -1 && line.length > 0) {
      // We've found a non-empty, non-table line after finding table content
      // This means the table has ended
      break;
    }
  }

  // If we're not in a table, return as-is
  if (tableStartIndex === -1 || lastTableEndIndex === -1) {
    return truncated;
  }

  // Count table lines we currently have
  const currentTableLines = lastTableEndIndex - tableStartIndex + 1;

  // If we already have at least MIN_TABLE_LINES, return as-is
  if (currentTableLines >= MIN_TABLE_LINES) {
    return truncated;
  }

  // We need to extend to include more table lines
  // Strategy: Find the table start in full content, extract MIN_TABLE_LINES from there,
  // and replace the partial table in truncated content

  const fullContentLines = fullContent.split("\n");

  // Find where the table starts in the full content by matching the first table line
  const firstTableLine = truncatedLines[tableStartIndex];
  let fullTableStartIndex = -1;

  for (let i = 0; i < fullContentLines.length; i++) {
    if (fullContentLines[i] === firstTableLine) {
      fullTableStartIndex = i;
      break;
    }
  }

  // If we can't find the table in full content, return as-is
  if (fullTableStartIndex === -1) {
    return truncated;
  }

  // Collect MIN_TABLE_LINES from the full content
  const tableLines: string[] = [];
  for (let i = fullTableStartIndex; i < fullContentLines.length; i++) {
    const line = fullContentLines[i];

    // Stop if we hit a non-table line
    if (!line.trim().includes("|") && line.trim().length > 0) {
      break;
    }

    if (line.trim().includes("|")) {
      tableLines.push(line);
      if (tableLines.length >= MIN_TABLE_LINES) {
        break;
      }
    }
  }

  // Build the result: content before table + complete table lines
  const contentBeforeTable = truncatedLines.slice(0, tableStartIndex);
  return contentBeforeTable.join("\n") + "\n" + tableLines.join("\n");
}

/**
 * Checks for unclosed code blocks and closes them properly.
 * Handles both triple-backtick code blocks and inline code.
 */
function closeUnclosedCodeBlocks(text: string): string {
  // Count triple-backtick code blocks
  const tripleBacktickCount = (text.match(/```/g) || []).length;

  // If odd number of triple backticks, we're inside a code block
  if (tripleBacktickCount % 2 === 1) {
    // Close the code block
    return text + "\n```";
  }

  return text;
}
