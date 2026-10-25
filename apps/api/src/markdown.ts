import { marked } from "marked";
import type { ContentBlock } from "@uh/contracts";
export function parseMarkdown(markdown: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  for (const token of marked.lexer(markdown)) {
    if (token.type === "heading")
      blocks.push({ type: "heading", text: token.text });
    else if (token.type === "paragraph" || token.type === "text")
      blocks.push({ type: "paragraph", text: token.text });
    else if (token.type === "blockquote")
      blocks.push({ type: "notice", text: token.text });
    else if (token.type === "list")
      blocks.push({
        type: "list",
        items: token.items.map((i: { text: string }) => i.text),
      });
    else if (token.type !== "space" && token.type !== "hr")
      throw new Error("正文只支持段落、标题、引用和列表");
  }
  return blocks;
}
