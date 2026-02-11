/**
 * Live API Validation Script
 *
 * Tests the connector against the real Docsie API.
 * Usage: npx tsx src/scripts/validate-live.ts
 */

import "dotenv/config";
import { DocsieClient } from "../docsie/client.js";
import { docToMarkdown } from "../docsie/content.js";
import { transformToMavenFormat } from "../maven/transform.js";

async function main() {
  const apiKey = process.env.DOCSIE_API_KEY;
  const baseUrl = process.env.DOCSIE_BASE_URL;

  if (!apiKey) {
    console.error("DOCSIE_API_KEY is required");
    process.exit(1);
  }

  const client = new DocsieClient({ apiKey, baseUrl });

  console.log("=== Live API Validation ===\n");

  // Test workspaces
  const workspaces = await client.getWorkspaces();
  console.log(`Workspaces: ${workspaces.length}`);
  for (const ws of workspaces) {
    console.log(`  ${ws.name} (${ws.id}) - ${ws.shelves_count} shelves`);
  }

  // Test documentation
  const docs = await client.getDocumentation();
  console.log(`\nDocumentation/Shelves: ${docs.length}`);

  // Test books
  const books = await client.getBooks();
  console.log(`Non-deleted Books: ${books.length}`);

  // Test articles
  const articles = await client.getArticles();
  console.log(`Total Articles: ${articles.length}`);

  // Count articles with content
  let withContent = 0;
  let empty = 0;
  for (const art of articles) {
    if (art.doc && art.doc.blocks && art.doc.blocks.length > 0) {
      withContent++;
    } else {
      empty++;
    }
  }
  console.log(`  With content: ${withContent}`);
  console.log(`  Empty: ${empty}`);

  // Test content conversion on first article with content
  const sampleArt = articles.find(
    (a) => a.doc && a.doc.blocks && a.doc.blocks.length > 0
  );

  if (sampleArt) {
    console.log("\n=== Sample Article ===");
    console.log(`Name: ${sampleArt.name}`);
    console.log(`ID: ${sampleArt.id}`);
    console.log(`Blocks: ${sampleArt.doc.blocks.length}`);

    const md = docToMarkdown(sampleArt.doc);
    console.log("\n--- Markdown Output ---");
    console.log(md.substring(0, 500));
    console.log("--- End ---");

    const maven = transformToMavenFormat(sampleArt);
    console.log("\n--- Maven Format ---");
    console.log(`Title: ${maven.title}`);
    console.log(`ContentType: ${maven.contentType}`);
    console.log(`Content length: ${maven.content.length} chars`);
    console.log(`Metadata: ${JSON.stringify(maven.metadata)}`);
    console.log(`ReferenceId: ${maven.knowledgeDocumentId.referenceId}`);
  }

  console.log("\n=== Validation PASSED ===");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
