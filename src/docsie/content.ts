/**
 * Docsie Content Converter
 *
 * Converts Docsie article doc blocks (Draft.js/ProseMirror hybrid)
 * to Markdown for Maven knowledge base ingestion.
 *
 * Block types found in real data:
 *   figure(406), unstyled(314), header-step(248), unordered-list-item(193),
 *   header-two(43), ordered-list-item(39), header-three(31), content(26),
 *   banner(22), tiles(7), video(7), embedd(7), gist-block(1), chart(1)
 */

import type { DocBlock, DocContent, ProseMirrorNode } from "./types.js";

/**
 * Convert a Docsie article's doc content to Markdown
 */
export function docToMarkdown(doc: DocContent): string {
  if (!doc || !doc.blocks || doc.blocks.length === 0) {
    return "";
  }

  const lines: string[] = [];
  let orderedListIndex = 0;

  for (const block of doc.blocks) {
    // Reset ordered list counter when leaving an ordered list
    if (block.type !== "ordered-list-item") {
      orderedListIndex = 0;
    }

    const line = convertBlock(block, orderedListIndex);
    if (block.type === "ordered-list-item") {
      orderedListIndex++;
    }

    if (line !== null) {
      lines.push(line);
    }
  }

  return lines.join("\n\n").trim();
}

function convertBlock(block: DocBlock, orderedIndex: number): string | null {
  switch (block.type) {
    case "unstyled":
      return block.text || "";

    case "header-one":
      return `# ${block.text}`;

    case "header-two":
      return `## ${block.text}`;

    case "header-three":
      return `### ${block.text}`;

    // Custom step header - treat as a bold paragraph
    case "header-step":
      return `**${block.text}**`;

    case "ordered-list-item":
      return `${orderedIndex + 1}. ${block.text}`;

    case "unordered-list-item":
      return `- ${block.text}`;

    case "figure":
      return convertFigure(block);

    case "video":
      return convertVideo(block);

    case "banner":
      return convertProseMirrorContent(block);

    case "content":
      return convertProseMirrorContent(block);

    case "tiles":
      return convertTiles(block);

    case "embedd":
      return convertEmbed(block);

    case "gist-block":
      return convertGist(block);

    case "chart":
      // Charts don't have meaningful text content
      return null;

    default:
      // Unknown block type - extract text if present
      return block.text || null;
  }
}

function convertFigure(block: DocBlock): string {
  const src = block.data?.src as string | undefined;
  const label = block.data?.label as string | undefined;

  if (!src) return "";
  return `![${label || ""}](${src})`;
}

function convertVideo(block: DocBlock): string {
  const src = block.data?.src as string | undefined;
  const label = block.data?.label as string | undefined;

  if (!src) return "";
  return `[${label || "Video"}](${src})`;
}

function convertEmbed(block: DocBlock): string {
  const src = block.data?.src as string | undefined;
  if (!src) return "";
  return `[Embedded content](${src})`;
}

function convertGist(block: DocBlock): string {
  const src = block.data?.src as string | undefined;
  if (!src) return block.text || "";
  return `[Code Gist](${src})`;
}

/**
 * Convert ProseMirror-style nested content to Markdown
 * Used by banner, content, and tiles blocks
 */
function convertProseMirrorContent(block: DocBlock): string {
  if (!block.content || block.content.length === 0) {
    return block.text || "";
  }

  const parts: string[] = [];

  for (const node of block.content) {
    const text = extractProseMirrorText(node);
    if (text) {
      parts.push(text);
    }
  }

  return parts.join("\n\n");
}

function convertTiles(block: DocBlock): string {
  if (!block.content || block.content.length === 0) {
    return "";
  }

  const parts: string[] = [];

  for (const tile of block.content) {
    // Each tile has a nested doc content
    if (tile.content) {
      for (const inner of tile.content) {
        const text = extractProseMirrorText(inner);
        if (text) {
          parts.push(text);
        }
      }
    }
  }

  return parts.join("\n\n");
}

/**
 * Recursively extract text from a ProseMirror node tree
 */
function extractProseMirrorText(node: ProseMirrorNode): string {
  if (node.type === "text") {
    return node.text || "";
  }

  if (!node.content || node.content.length === 0) {
    return node.text || "";
  }

  const childTexts: string[] = [];
  for (const child of node.content) {
    const text = extractProseMirrorText(child);
    if (text) {
      childTexts.push(text);
    }
  }

  const joined = childTexts.join("");

  switch (node.type) {
    case "heading": {
      const level = (node.attrs?.level as number) || 2;
      const prefix = "#".repeat(level);
      return `${prefix} ${joined}`;
    }

    case "paragraph":
      return joined;

    case "bulletList":
    case "bullet_list":
      return childTexts.map((t) => `- ${t}`).join("\n");

    case "orderedList":
    case "ordered_list":
      return childTexts.map((t, i) => `${i + 1}. ${t}`).join("\n");

    case "listItem":
    case "list_item":
      return joined;

    case "blockquote":
      return childTexts.map((t) => `> ${t}`).join("\n");

    case "codeBlock":
    case "code_block":
      return `\`\`\`\n${joined}\n\`\`\``;

    case "doc":
      return childTexts.join("\n\n");

    default:
      return joined;
  }
}
