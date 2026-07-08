import { TextEdit } from "@repo/shared";

export function tagJSXCode(
  code: string,
  startCounter: number,
): { code: string; newCounter: number } {
  let counter = startCounter;
  let result = "";
  let i = 0;
  const len = code.length;

  while (i < len) {
    const char = code[i];

    // Handle comments and strings
    if (char === "/" && code[i + 1] === "/") {
      // Single line comment
      while (i < len && code[i] !== "\n") {
        result += code[i++];
      }
      continue;
    }
    if (char === "/" && code[i + 1] === "*") {
      // Multi line comment
      result += "/*";
      i += 2;
      while (i < len && !(code[i] === "*" && code[i + 1] === "/")) {
        result += code[i++];
      }
      if (i < len) {
        result += "*/";
        i += 2;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      const quote = char;
      result += quote;
      i++;
      while (i < len && code[i] !== quote) {
        if (code[i] === "\\") {
          result += "\\" + (code[i + 1] || "");
          i += 2;
        } else {
          result += code[i++];
        }
      }
      if (i < len) {
        result += quote;
        i++;
      }
      continue;
    }

    // Look for JSX opening tag
    if (char === "<") {
      // Check if it's preceded by a word character (ignoring whitespace back)
      let prevNonWsIdx = i - 1;
      while (prevNonWsIdx >= 0 && /\s/.test(code[prevNonWsIdx])) {
        prevNonWsIdx--;
      }
      const isPrecededByWordChar =
        prevNonWsIdx >= 0 && /[a-zA-Z0-9_]/.test(code[prevNonWsIdx]);

      // Peek next characters to ensure it looks like a tag
      const nextChar = code[i + 1];
      const isTagNameStart = nextChar && /[a-zA-Z_]/.test(nextChar);

      if (isPrecededByWordChar || !isTagNameStart) {
        // Skip: it is a TS generic (preceded by a word character) or not a tag name
        result += "<";
        i++;
        continue;
      }

      // We found a potential JSX tag! Let's parse it.
      let tagStart = i;
      i++; // consume '<'

      // Read tag name (can contain letters, numbers, dot, colon, hyphen)
      let tagName = "";
      while (i < len && /[a-zA-Z0-9_.:-]/.test(code[i])) {
        tagName += code[i++];
      }

      // Read attributes until the closing '>' or '/>' of the opening tag.
      // We must handle nested strings and curly braces.
      let attrs = "";
      let braceDepth = 0;
      let inDoubleQuote = false;
      let inSingleQuote = false;
      let inBacktick = false;
      let isSelfClosing = false;
      let closed = false;
      let hasTopLevelId = false;

      while (i < len) {
        const c = code[i];

        if (inDoubleQuote) {
          attrs += c;
          if (c === "\\") {
            attrs += code[i + 1] || "";
            i += 2;
          } else {
            if (c === '"') inDoubleQuote = false;
            i++;
          }
          continue;
        }
        if (inSingleQuote) {
          attrs += c;
          if (c === "\\") {
            attrs += code[i + 1] || "";
            i += 2;
          } else {
            if (c === "'") inSingleQuote = false;
            i++;
          }
          continue;
        }
        if (inBacktick) {
          attrs += c;
          if (c === "\\") {
            attrs += code[i + 1] || "";
            i += 2;
          } else {
            if (c === "`") inBacktick = false;
            i++;
          }
          continue;
        }

        // Detect top-level data-id attribute
        if (
          braceDepth === 0 &&
          !inDoubleQuote &&
          !inSingleQuote &&
          !inBacktick
        ) {
          if (code.substring(i, i + 8) === "data-id=") {
            hasTopLevelId = true;
          }
        }

        // Handle quotes outside strings
        if (c === '"') {
          inDoubleQuote = true;
          attrs += c;
          i++;
          continue;
        }
        if (c === "'") {
          inSingleQuote = true;
          attrs += c;
          i++;
          continue;
        }
        if (c === "`") {
          inBacktick = true;
          attrs += c;
          i++;
          continue;
        }

        // Handle curly braces (nesting inside attribute values)
        if (c === "{") {
          braceDepth++;
          attrs += c;
          i++;
          continue;
        }
        if (c === "}") {
          if (braceDepth > 0) braceDepth--;
          attrs += c;
          i++;
          continue;
        }

        // Check for closing of opening tag
        if (braceDepth === 0) {
          if (c === "/" && code[i + 1] === ">") {
            isSelfClosing = true;
            i += 2;
            closed = true;
            break;
          }
          if (c === ">") {
            i++;
            closed = true;
            break;
          }
        }

        attrs += c;
        i++;
      }

      if (closed) {
        // We successfully parsed a tag!
        // Recursively tag nested JSX elements in attribute expressions first
        const taggedAttrs = tagJSXCode(attrs, counter);
        let finalAttrs = taggedAttrs.code;
        counter = taggedAttrs.newCounter;

        // Check if we should skip tagging this element itself
        const isTemplate = tagName.toLowerCase() === "template";

        // Distinguish between React components and TS Generics
        let isRealJSX = true;
        const isCapitalized =
          tagName[0] && tagName[0] === tagName[0].toUpperCase();
        // Standard HTML/SVG tags that might be capitalized or are safe to tag
        const htmlTags = new Set([
          "svg",
          "path",
          "math",
          "g",
          "rect",
          "circle",
          "line",
          "polyline",
          "polygon",
          "text",
          "tspan",
          "foreignObject",
        ]);
        const isHtmlTag = !isCapitalized || htmlTags.has(tagName.toLowerCase());

        if (isCapitalized && !isHtmlTag) {
          // It's a capitalized tag name (could be a React component or a TS generic).
          // It is ONLY a real JSX tag if:
          // 1. It is self-closing (e.g., <TodoItem />)
          // 2. It has attributes (e.g., <TodoItem className="..." />)
          // 3. There is a matching closing tag </TagName> in the remaining code
          const hasAttrs =
            finalAttrs.trim().length > 0 && !finalAttrs.trim().startsWith("[");
          const remainingCode = code.substring(i);
          const hasClosingTag = remainingCode.includes(`</${tagName}>`);

          if (!isSelfClosing && !hasAttrs && !hasClosingTag) {
            isRealJSX = false;
          }
        }

        if (!isTemplate && !hasTopLevelId && isRealJSX) {
          counter++;
          const idAttr = `data-id="el-${counter}"`;

          // Clean up spacing: trim attribute string and construct cleanly
          const trimmedAttrs = finalAttrs.trim();
          if (isSelfClosing) {
            result += `<${tagName}${trimmedAttrs ? " " + trimmedAttrs : ""} ${idAttr} />`;
          } else {
            result += `<${tagName}${trimmedAttrs ? " " + trimmedAttrs : ""} ${idAttr}>`;
          }
        } else {
          // Reconstruct as-is
          const trimmedAttrs = finalAttrs.trim();
          if (isSelfClosing) {
            result += `<${tagName}${trimmedAttrs ? " " + trimmedAttrs : ""} />`;
          } else {
            result += `<${tagName}${trimmedAttrs ? " " + trimmedAttrs : ""}>`;
          }
        }
      } else {
        // Unclosed tag / syntax error: revert
        result += code.substring(tagStart, i);
      }
      continue;
    }

    result += char;
    i++;
  }

  return { code: result, newCounter: counter };
}

export function insertJSXElement(
  code: string,
  targetId: string,
  childCode: string,
): string {
  const normalRegex = new RegExp(
    `(<[a-zA-Z][a-zA-Z0-9]*\\s+[^>]*data-id=["']${targetId}["'][^>]*>)(.*?)(</[a-zA-Z][a-zA-Z0-9]*>)`,
    "s",
  );
  if (normalRegex.test(code)) {
    return code.replace(
      normalRegex,
      (_m, openingTag, innerContent, closingTag) => {
        return `${openingTag}${innerContent}\n${childCode}\n${closingTag}`;
      },
    );
  }

  const selfClosingRegex = new RegExp(
    `(<[a-zA-Z][a-zA-Z0-9]*\\s+[^>]*data-id=["']${targetId}["'][^>]*\\/>)`,
    "s",
  );
  if (selfClosingRegex.test(code)) {
    return code.replace(selfClosingRegex, (_m, tag) => {
      return `${tag}\n${childCode}`;
    });
  }

  return code;
}

export function deleteJSXElement(code: string, targetId: string): string {
  const normalRegex = new RegExp(
    `<([a-zA-Z][a-zA-Z0-9]*)\\s+[^>]*data-id=["']${targetId}["'][^>]*>(.*?)</\\1>`,
    "s",
  );
  if (normalRegex.test(code)) {
    return code.replace(normalRegex, "");
  }
  const selfClosingRegex = new RegExp(
    `<[a-zA-Z][a-zA-Z0-9]*\\s+[^>]*data-id=["']${targetId}["'][^>]*\\/>`,
    "s",
  );
  if (selfClosingRegex.test(code)) {
    return code.replace(selfClosingRegex, "");
  }
  return code;
}

export function extractJSXElement(code: string, targetId: string): string {
  const normalRegex = new RegExp(
    `<([a-zA-Z][a-zA-Z0-9]*)\\s+[^>]*data-id=["']${targetId}["'][^>]*>(.*?)</\\1>`,
    "s",
  );
  const match = code.match(normalRegex);
  if (match) return match[0];

  const selfClosingRegex = new RegExp(
    `<[a-zA-Z][a-zA-Z0-9]*\\s+[^>]*data-id=["']${targetId}["'][^>]*\\/>`,
    "s",
  );
  const selfMatch = code.match(selfClosingRegex);
  if (selfMatch) return selfMatch[0];

  return "";
}

export function moveJSXElement(
  code: string,
  draggedId: string,
  targetId: string,
): string {
  const elementCode = extractJSXElement(code, draggedId);
  if (!elementCode) return code;
  const cleanCode = deleteJSXElement(code, draggedId);
  return insertJSXElement(cleanCode, targetId, elementCode);
}

export function updateJSXElement(
  code: string,
  targetId: string,
  updatedProps: { text?: string; classes?: string[] },
): string {
  const regex = new RegExp(
    `(<[a-zA-Z][a-zA-Z0-9]*\\s+[^>]*data-id=["']${targetId}["'][^>]*>)(.*?)(</[a-zA-Z][a-zA-Z0-9]*>)`,
    "s",
  );

  if (updatedProps.text !== undefined && regex.test(code)) {
    return code.replace(regex, (_m, openingTag, _oldText, closingTag) => {
      return `${openingTag}${updatedProps.text}${closingTag}`;
    });
  }

  if (updatedProps.classes !== undefined) {
    const tagRegex = new RegExp(
      `(<[a-zA-Z][a-zA-Z0-9]*\\s+[^>]*data-id=["']${targetId}["'][^>]*>)`,
      "s",
    );
    return code.replace(tagRegex, (_m, openingTag: string) => {
      const newClassesString = updatedProps.classes!.join(" ");
      if (openingTag.includes("className=")) {
        return openingTag.replace(
          /className=["'][^"']*["']/,
          `className="${newClassesString}"`,
        );
      }
      return openingTag.replace(/>$/, ` className="${newClassesString}">`);
    });
  }

  return code;
}

export function injectIntoApp(appContent: string, snippet: string): string {
  const returnRegex = /(return\s*\(\s*<div[^>]*>)/s;
  if (returnRegex.test(appContent)) {
    return appContent.replace(
      returnRegex,
      (match) => `${match}\n      ${snippet}`,
    );
  }
  const fallbackRegex = /(<\/div>\s*\);\s*})/s;
  return appContent.replace(
    fallbackRegex,
    () => `  ${snippet}\n    </div>\n  );\n}`,
  );
}
