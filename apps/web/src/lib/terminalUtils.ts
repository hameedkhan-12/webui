/**
 * Pure helpers used by useWorkspace's terminal/console output handling.
 * Deliberately has ZERO dependency on React state, refs, or closures --
 * everything here is a plain function of its arguments. That's what makes it
 * safe to extract: unlike the WebContainer boot/install/dev-server lifecycle
 * elsewhere in useWorkspace.ts (which closes over webcontainerRef, filesRef,
 * isInstallingRef, etc. and can only really be verified by running the app),
 * these functions can be fully checked by reading them or writing a couple of
 * unit tests -- no risk of silently breaking an effect's dependency array.
 */

/** Strip ANSI escape / control sequences (color codes, cursor movement) from a terminal chunk. */
export function stripAnsi(str: string): string {
  return str.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    "",
  );
}

/**
 * djb2-ish 32-bit string hash, used to detect whether package.json content
 * changed (so we know whether to invalidate the cached node_modules snapshot).
 * Not cryptographic -- just needs to be cheap and collision-unlikely for this.
 */
export function computePackageJsonHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

export interface TerminalLineClassification {
  /** Non-null when this line indicates a compile/module-resolution error. */
  detectedError: string | null;
  /** True when this line indicates the previous error state has cleared (successful compile/ready). */
  clearsError: boolean;
}

/**
 * Classifies a single cleaned (ANSI-stripped) terminal line so useWorkspace
 * can decide whether to set/clear `lastCompileError`. Pulled out of
 * appendTerminalOutput because the pattern-matching itself has no dependency
 * on component state -- only what to DO with the result does.
 */
export function classifyTerminalLine(cleanText: string): TerminalLineClassification {
  const lower = cleanText.toLowerCase();
  const isError =
    lower.includes("failed to compile") ||
    lower.includes("compile error") ||
    lower.includes("module not found") ||
    lower.includes("can't resolve");
  const clearsError =
    lower.includes("compiled successfully") ||
    lower.includes("ready in") ||
    lower.includes("✓ ready");

  return { detectedError: isError ? cleanText : null, clearsError };
}
