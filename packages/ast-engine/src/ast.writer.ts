// packages/ast-engine/src/ast.writer.ts
/**
 * ASTWriter — write path.
 *
 * All methods accept a source string and return a NEW source string.
 * Nothing is mutated. No filesystem I/O. No side effects.
 *
 * IMPORTANT: this is real Babel (@babel/parser + @babel/traverse), not regex.
 * Mutations are applied by SPLICING the exact character range of the changed
 * node back into the original source string -- not by calling Babel's
 * generator on the whole file. This keeps diffs minimal (only the touched
 * attribute/text changes) and avoids Babel's generator reformatting code the
 * user never touched, which would happen with a full-file regenerate.
 */

import * as t from "@babel/types";
import type { NodePath } from "@babel/traverse";
import { traverse } from "./babel-interop.js";
import type {
  UpdatePropOperation,
  UpdateStyleOperation,
  UpdateChildrenOperation,
  AddClassOperation,
  RemoveClassOperation,
} from "@repo/shared";
import { findOpeningElement, parseSource } from "./ast.parser.js";

const INTERNAL_ONLY_CLASSES = new Set([
  "designer-hover",
  "designer-selected",
  "designer-dragover",
]);

function stripInternalClasses(classes: readonly string[]): string[] {
  return classes.filter((c) => !INTERNAL_ONLY_CLASSES.has(c));
}
/**
 * Thrown when a target node is found, but its className (or other mutated
 * value) is written in a shape this engine can't safely rewrite without risk
 * of corrupting the expression -- e.g. a ternary, a template literal, or a
 * clsx()/cn() call whose first argument isn't a plain string literal.
 *
 * This is a deliberate design choice: refuse and surface the failure rather
 * than silently doing nothing (the previous regex-based writer's behavior)
 * or guessing and potentially corrupting working code.
 */
export class AstMutationError extends Error {
  constructor(
    message: string,
    readonly auraId: string,
  ) {
    super(message);
    this.name = "AstMutationError";
  }
}

// ─── className helpers ──────────────────────────────────────────────────────

type ClassNameInfo =
  | { readonly kind: "absent" }
  | {
      readonly kind: "string";
      readonly value: string;
      readonly start: number;
      readonly end: number;
    }
  | {
      readonly kind: "call-first-arg";
      readonly value: string;
      readonly start: number;
      readonly end: number;
    }
  | { readonly kind: "unsupported" };

const CLASS_HELPER_CALLEES = new Set(["cn", "clsx", "classNames", "twMerge"]);

/**
 * Inspect the className attribute on a JSXOpeningElement and classify it:
 * - absent: no className attribute at all
 * - string: className="a b c" -- can mutate directly
 * - call-first-arg: className={cn("a b c", condition && "d")} -- can mutate
 *   the first string-literal argument only, leaving the rest of the call
 *   (conditionals, other args) completely untouched
 * - unsupported: anything else (template literal, ternary, bare identifier,
 *   a call whose first arg isn't a plain string) -- refuse to touch it
 */
function classifyClassName(node: t.JSXOpeningElement): ClassNameInfo {
  const attr = node.attributes.find(
    (a): a is t.JSXAttribute =>
      t.isJSXAttribute(a) &&
      t.isJSXIdentifier(a.name) &&
      a.name.name === "className",
  );
  if (!attr) return { kind: "absent" };
  if (attr.value == null) return { kind: "unsupported" };

  if (t.isStringLiteral(attr.value)) {
    if (attr.value.start == null || attr.value.end == null)
      return { kind: "unsupported" };
    return {
      kind: "string",
      value: attr.value.value,
      // +1/-1 to target the content INSIDE the quotes, not the quote chars.
      start: attr.value.start + 1,
      end: attr.value.end - 1,
    };
  }

  if (t.isJSXExpressionContainer(attr.value)) {
    const expr = attr.value.expression;
    if (
      t.isCallExpression(expr) &&
      t.isIdentifier(expr.callee) &&
      CLASS_HELPER_CALLEES.has(expr.callee.name) &&
      expr.arguments.length > 0 &&
      t.isStringLiteral(expr.arguments[0])
    ) {
      const firstArg = expr.arguments[0] as t.StringLiteral;
      if (firstArg.start == null || firstArg.end == null)
        return { kind: "unsupported" };
      return {
        kind: "call-first-arg",
        value: firstArg.value,
        start: firstArg.start + 1,
        end: firstArg.end - 1,
      };
    }
    if (t.isStringLiteral(expr)) {
      if (expr.start == null || expr.end == null)
        return { kind: "unsupported" };
      return {
        kind: "string",
        value: expr.value,
        start: expr.start + 1,
        end: expr.end - 1,
      };
    }
  }

  return { kind: "unsupported" };
}

/**
 * Apply a class-list transform to the target node's className, splicing only
 * the affected substring back into `source`. Throws AstMutationError if the
 * className expression isn't a shape we can safely rewrite, or if the node
 * itself can't be found (this differs from updateProp/updateChildren, which
 * silently no-op on a missing node -- className mutation is always initiated
 * by a specific, deliberate user action in the inspector, so silently doing
 * nothing would look like a bug rather than a no-op).
 */
function mutateClassName(
  source: string,
  auraId: string,
  transform: (classes: string) => string,
): string {
  const result = findOpeningElement(source, auraId);
  if (!result) {
    throw new AstMutationError(
      `No element found with data-id="${auraId}"`,
      auraId,
    );
  }

  const info = classifyClassName(result.path.node);

  if (info.kind === "absent") {
    // No className yet -- create one via the same insert-before-close logic
    // as updateProp, using the transform against an empty starting string.
    const newClasses = transform("").trim();
    return insertOrReplaceAttr(
      source,
      result.path.node,
      "className",
      JSON.stringify(newClasses),
    );
  }

  if (info.kind === "unsupported") {
    throw new AstMutationError(
      `className on element "${auraId}" is written in a form this engine can't safely rewrite ` +
        `(e.g. a ternary, template literal, or a helper call whose first argument isn't a plain string). ` +
        `Edit this element's classes directly in the code editor instead.`,
      auraId,
    );
  }

  const newClasses = transform(info.value).trim();
  return source.slice(0, info.start) + newClasses + source.slice(info.end);
}

// ─── attribute insert/replace helper (shared by updateProp + className-absent case) ──

function insertOrReplaceAttr(
  source: string,
  node: t.JSXOpeningElement,
  prop: string,
  valueCode: string,
): string {
  const existing = node.attributes.find(
    (a): a is t.JSXAttribute =>
      t.isJSXAttribute(a) && t.isJSXIdentifier(a.name) && a.name.name === prop,
  );
  const attrCode = `${prop}=${valueCode}`;

  if (existing && existing.start != null && existing.end != null) {
    return (
      source.slice(0, existing.start) + attrCode + source.slice(existing.end)
    );
  }

  // Attribute doesn't exist -- insert immediately before the tag's closing
  // `>` or `/>`.
  const tagEnd = node.end!;
  const insertAt = node.selfClosing ? tagEnd - 2 : tagEnd - 1;
  return source.slice(0, insertAt) + ` ${attrCode}` + source.slice(insertAt);
}

/** Format a non-string JS value as source code for a JSX expression container. */
function formatLiteral(value: unknown): string {
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  return JSON.stringify(value);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Rewrite a JSX prop value on the node identified by `op.auraId`.
 * String values are quoted; all other values are wrapped in `{}`.
 * Returns the source UNCHANGED if the target node isn't found (matches the
 * previous engine's contract -- a stale/missing auraId is a soft no-op here,
 * since prop updates can legitimately race with other edits removing the node).
 */
export function updateProp(source: string, op: UpdatePropOperation): string {
  const result = findOpeningElement(source, op.auraId);
  if (!result) return source;

  const valueCode =
    typeof op.value === "string"
      ? JSON.stringify(op.value)
      : `{${formatLiteral(op.value)}}`;
  return insertOrReplaceAttr(source, result.path.node, op.prop, valueCode);
}

/**
 * Replace `op.oldClass` with `op.newClass` inside `className` of the target node.
 * Throws AstMutationError if the node is missing or className can't be safely rewritten.
 */
export function updateStyle(source: string, op: UpdateStyleOperation): string {
  return mutateClassName(source, op.auraId, (classes) =>
    classes
      .split(/\s+/)
      .filter(Boolean)
      .map((cls) => (cls === op.oldClass ? op.newClass : cls))
      .join(" "),
  );
}

/**
 * Replace the text children of the node identified by `op.auraId`.
 * Only rewrites a SINGLE plain-text child; if the element's children include
 * other JSX elements or expressions, this throws rather than clobbering them
 * (the old regex-based updateChildren would silently replace everything
 * between the tags, including nested elements -- that's the exact class of
 * silent corruption this rewrite exists to prevent).
 */
export function updateChildren(
  source: string,
  op: UpdateChildrenOperation,
): string {
  const result = findOpeningElement(source, op.auraId);
  if (!result) return source;

  const openingPath = result.path;
  const parent = openingPath.parentPath;
  if (!parent || !t.isJSXElement(parent.node)) return source;

  const element = parent.node;
  const meaningfulChildren = element.children.filter(
    (c) => !(t.isJSXText(c) && c.value.trim() === ""),
  );

  if (meaningfulChildren.length === 0) {
    // No children yet -- insert text right after the opening tag.
    const insertAt = openingPath.node.end!;
    return source.slice(0, insertAt) + op.value + source.slice(insertAt);
  }

  if (meaningfulChildren.length === 1 && t.isJSXText(meaningfulChildren[0])) {
    const textNode = meaningfulChildren[0] as t.JSXText;
    if (textNode.start == null || textNode.end == null) {
      throw new AstMutationError(
        `Could not locate text child bounds for "${op.auraId}"`,
        op.auraId,
      );
    }
    return (
      source.slice(0, textNode.start) + op.value + source.slice(textNode.end)
    );
  }

  throw new AstMutationError(
    `Element "${op.auraId}" has non-text children (nested elements/expressions) -- ` +
      `refusing to overwrite them via a text update. Edit this element's children in the code editor instead.`,
    op.auraId,
  );
}

export function addClass(source: string, op: AddClassOperation): string {
  return mutateClassName(source, op.auraId, (classes) => {
    const list = stripInternalClasses(classes.split(/\s+/).filter(Boolean))
    if (list.includes(op.className) || INTERNAL_ONLY_CLASSES.has(op.className)) return list.join(' ')
    return [...list, op.className].join(' ')
  })
}

export function removeClass(source: string, op: RemoveClassOperation): string {
  return mutateClassName(source, op.auraId, (classes) =>
    stripInternalClasses(classes.split(/\s+/).filter(Boolean))
      .filter((cls) => cls !== op.className)
      .join(' ')
  )
}
/**
 * Rewrite ONE field of ONE item in a source-literal array declaration --
 * `const <iterableName> = [ {..}, {..}, .. ]` -- identified by `index`, in
 * place. This is how per-card editing inside a `.map()` actually works: the
 * JSX template itself is shared by every rendered instance (see
 * getRepeatContext), but the DATA it maps over lives at one address per
 * item, so editing item N's field is well-defined even though editing "item
 * N's JSX" isn't.
 *
 * Refuses (throws AstMutationError) rather than guessing when:
 * - the array declaration can't be found in this file
 * - the element at `index` isn't an object literal
 * - the field doesn't exist, or its current value isn't a plain
 *   string/number/boolean literal (e.g. it's a template literal, a nested
 *   object, or a computed expression) -- overwriting those could silently
 *   drop real logic.
 */
export function updateArrayItemField(
  source: string,
  iterableName: string,
  index: number,
  key: string,
  newValue: string | number | boolean,
): string {
  const ast = parseSource(source)
  if (!ast) {
    throw new AstMutationError(`Could not parse source`, iterableName)
  }

  let targetProp: t.ObjectProperty | null = null
  let foundDeclaration = false
  let foundElement = false

  traverse(ast, {
    VariableDeclarator(path) {
      if (targetProp || foundDeclaration) return
      if (
        !t.isIdentifier(path.node.id) ||
        path.node.id.name !== iterableName ||
        !path.node.init ||
        !t.isArrayExpression(path.node.init)
      ) {
        return
      }
      foundDeclaration = true

      const el = path.node.init.elements[index]
      if (!el || !t.isObjectExpression(el)) return
      foundElement = true

      for (const prop of el.properties) {
        if (!t.isObjectProperty(prop)) continue
        const propKey = t.isIdentifier(prop.key)
          ? prop.key.name
          : t.isStringLiteral(prop.key)
            ? prop.key.value
            : null
        if (propKey === key) {
          targetProp = prop
          break
        }
      }
    },
  })

  if (!foundDeclaration) {
    throw new AstMutationError(
      `No literal array declaration "const ${iterableName} = [...]" found in this file -- ` +
        `the data may live in another file, come from props, or be fetched at runtime, none of which this engine can rewrite.`,
      iterableName,
    )
  }
  if (!foundElement) {
    throw new AstMutationError(
      `Item ${index} of "${iterableName}" isn't a plain object literal -- refusing to guess at its shape.`,
      iterableName,
    )
  }
  if (!targetProp) {
    throw new AstMutationError(
      `Field "${key}" not found on item ${index} of "${iterableName}".`,
      iterableName,
    )
  }

  const valueNode = (targetProp as t.ObjectProperty).value
  if (valueNode.start == null || valueNode.end == null) {
    throw new AstMutationError(
      `Could not locate source range for field "${key}" on item ${index} of "${iterableName}".`,
      iterableName,
    )
  }
  if (
    !t.isStringLiteral(valueNode) &&
    !t.isNumericLiteral(valueNode) &&
    !t.isBooleanLiteral(valueNode)
  ) {
    throw new AstMutationError(
      `Field "${key}" on item ${index} of "${iterableName}" isn't a plain string/number/boolean literal -- ` +
        `refusing to overwrite an expression (could be logic, not just data).`,
      iterableName,
    )
  }

  const newCode =
    typeof newValue === 'string' ? JSON.stringify(newValue) : String(newValue)
  return source.slice(0, valueNode.start) + newCode + source.slice(valueNode.end)
}

/**
 * Insert a new JSX element as a SIBLING of the element identified by
 * `targetAuraId` -- immediately before or after it, at the same nesting level.
 * Use insertElement instead if you want to insert AS A CHILD of a target.
 */
export function insertSibling(
  source: string,
  targetAuraId: string,
  elementCode: string,
  placement: "before" | "after",
): string {
  const result = findOpeningElement(source, targetAuraId);
  if (!result) return source;

  const openingNode = result.path.node;
  const targetElementNode: t.Node =
    result.path.parentPath &&
    (t.isJSXElement(result.path.parentPath.node) ||
      t.isJSXFragment(result.path.parentPath.node))
      ? result.path.parentPath.node
      : openingNode;

  if (targetElementNode.start == null || targetElementNode.end == null)
    return source;

  const indentMatch = /[ \t]*$/.exec(
    source.slice(0, targetElementNode.start).split("\n").slice(-1)[0] ?? "",
  );
  const indent = indentMatch?.[0] ?? "";

  if (placement === "before") {
    const insertAt = targetElementNode.start;
    return (
      source.slice(0, insertAt) +
      `${elementCode}\n${indent}` +
      source.slice(insertAt)
    );
  }

  // placement === 'after'
  const insertAt = targetElementNode.end;
  return (
    source.slice(0, insertAt) +
    `\n${indent}${elementCode}` +
    source.slice(insertAt)
  );
}

/**
 * Replace the ENTIRE class list on the target node's className, wholesale --
 * different from addClass/removeClass/updateStyle, which mutate one token at
 * a time. Matches UPDATE_CLASS's actual payload shape (a full `classes: string[]`
 * replacement), not an add/remove delta.
 */
export function setClasses(source: string, auraId: string, classes: readonly string[]): string {
  return mutateClassName(source, auraId, () => stripInternalClasses(classes).join(' '))
}
/**
 * Insert an element as the last child of the file's outermost returned JSX
 * root -- used when no explicit target/parent id is given (e.g. dropping a
 * component with no selection active). Finds the first JSXElement in the
 * file that isn't nested inside another JSXElement.
 */
export function insertIntoFileRoot(
  source: string,
  elementCode: string,
): string {
  const ast = parseSource(source);
  if (!ast) return source;

  let rootPath: NodePath<t.JSXElement> | null = null;
  traverse(ast, {
    JSXElement(path) {
      if (rootPath) return;
      const isNested = !!path.findParent((p) => t.isJSXElement(p.node));
      if (!isNested) {
        rootPath = path;
        path.stop();
      }
    },
  });

  if (!rootPath) return source;
  const element = (rootPath as NodePath<t.JSXElement>).node;

  const indentMatch = /[ \t]*$/.exec(
    source
      .slice(0, element.start ?? 0)
      .split("\n")
      .slice(-1)[0] ?? "",
  );
  const indent = (indentMatch?.[0] ?? "") + "  ";
  const snippet = `\n${indent}${elementCode}`;

  if (element.children.length === 0) {
    const insertAt = element.openingElement.end!;
    return source.slice(0, insertAt) + snippet + source.slice(insertAt);
  }

  const lastChild = element.children[element.children.length - 1]!;
  const insertAt = lastChild.end ?? element.openingElement.end!;
  return source.slice(0, insertAt) + snippet + source.slice(insertAt);
}

// ─── New operations (replace apps/web/src/lib/jsxUtils.ts entirely) ───────────

export interface InsertElementOptions {
  readonly parentAuraId: string;
  /** Raw JSX source of the element to insert, e.g. `<Card title="X" />` */
  readonly elementCode: string;
  /** 'start' | 'end' -- where within the parent's children to insert. Default: 'end' */
  readonly position?: "start" | "end";
}

/**
 * Insert a new JSX element as a child of the element identified by
 * `options.parentAuraId`. Replaces jsxUtils.ts's insertJSXElement +
 * injectIntoApp with a real, tag-depth-aware implementation -- the regex
 * version could insert into the WRONG closing tag when nested elements
 * shared a tag name (e.g. two <div>s), since its regex match was not aware
 * of JSX nesting depth at all.
 */
export function insertElement(
  source: string,
  options: InsertElementOptions,
): string {
  const result = findOpeningElement(source, options.parentAuraId);
  if (!result) return source;

  const openingNode = result.path.node;
  if (openingNode.selfClosing) {
    throw new AstMutationError(
      `Cannot insert a child into "${options.parentAuraId}" -- it's a self-closing element with no children slot.`,
      options.parentAuraId,
    );
  }

  const parent = result.path.parentPath;
  if (!parent || !t.isJSXElement(parent.node)) return source;
  const element = parent.node;

  const position = options.position ?? "end";
  const indentMatch = /^[ \t]*/.exec(
    source.slice(
      source.lastIndexOf("\n", openingNode.start ?? 0) + 1,
      openingNode.start ?? 0,
    ),
  );
  const indent = (indentMatch?.[0] ?? "") + "  ";
  const snippet = `\n${indent}${options.elementCode}`;

  if (element.children.length === 0) {
    const insertAt = openingNode.end!;
    return source.slice(0, insertAt) + snippet + source.slice(insertAt);
  }

  if (position === "start") {
    const firstChild = element.children[0]!;
    const insertAt = firstChild.start ?? openingNode.end!;
    return (
      source.slice(0, insertAt) +
      snippet.slice(1) +
      `\n${indent}` +
      source.slice(insertAt)
    );
  }

  // position === 'end': insert right before the closing tag
  const lastChild = element.children[element.children.length - 1]!;
  const insertAt = lastChild.end ?? openingNode.end!;
  return source.slice(0, insertAt) + snippet + source.slice(insertAt);
}

/**
 * Delete the JSX element (and everything inside it) identified by `auraId`.
 * Uses the real element's start/end (from its enclosing JSXElement, not just
 * the opening tag) so nested same-name children are never mismatched --
 * the exact bug class the old regex-based deleteJSXElement was exposed to.
 */
export function deleteElement(source: string, auraId: string): string {
  const result = findOpeningElement(source, auraId);
  if (!result) return source;

  const openingNode = result.path.node;
  const targetNode: t.Node =
    result.path.parentPath &&
    (t.isJSXElement(result.path.parentPath.node) ||
      t.isJSXFragment(result.path.parentPath.node))
      ? result.path.parentPath.node
      : openingNode;

  if (targetNode.start == null || targetNode.end == null) return source;

  // Also strip a single leading newline+whitespace before the element, if
  // present, so deleting a child doesn't leave a blank line behind.
  let start = targetNode.start;
  const before = source.slice(Math.max(0, start - 200), start);
  const trailingWsMatch = /\n[ \t]*$/.exec(before);
  if (trailingWsMatch) {
    start -= trailingWsMatch[0].length;
  }

  return source.slice(0, start) + source.slice(targetNode.end);
}

/**
 * Move the element identified by `draggedAuraId` to become a child of the
 * element identified by `targetParentAuraId`.
 */
export function moveElement(
  source: string,
  draggedAuraId: string,
  targetParentAuraId: string,
  position: "start" | "end" = "end",
): string {
  const dragged = findOpeningElement(source, draggedAuraId);
  if (!dragged) return source;

  const draggedOpening = dragged.path.node;
  const draggedElementNode: t.Node =
    dragged.path.parentPath && t.isJSXElement(dragged.path.parentPath.node)
      ? dragged.path.parentPath.node
      : draggedOpening;

  if (draggedElementNode.start == null || draggedElementNode.end == null)
    return source;
  const elementCode = source.slice(
    draggedElementNode.start,
    draggedElementNode.end,
  );

  const withoutDragged = deleteElement(source, draggedAuraId);
  return insertElement(withoutDragged, {
    parentAuraId: targetParentAuraId,
    elementCode,
    position,
  });
}
