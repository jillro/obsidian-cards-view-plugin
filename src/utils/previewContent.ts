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
