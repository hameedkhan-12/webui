"use client";

import React from "react";
import { SelectedElement } from "@repo/shared";

/**
 * useElementEditor
 *
 * Onlook-style real-time editing pipeline:
 *   1. Style change comes from StylePanel
 *   2. Immediately postMessage APPLY_STYLE to iframe → instant visual feedback
 *   3. After 350ms debounce → call onUpdateElement() to write Tailwind class to source file
 *
 * The hook returns helpers that StylePanel uses instead of calling onUpdateElement directly.
 */

export interface ElementEditorOptions {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  selectedElement: SelectedElement | null;
  onUpdateElement: (
    filePath: string,
    elementId: string,
    patch: { text?: string; classes?: string[] }
  ) => void;
}

export function useElementEditor({
  iframeRef,
  selectedElement,
  onUpdateElement,
}: ElementEditorOptions) {
  // Debounce file-write per element
  const writeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const postToIframe = React.useCallback(
    (message: Record<string, unknown>) => {
      try {
        const win = iframeRef.current?.contentWindow;
        if (win) win.postMessage(message, "*");
      } catch {
        // cross-origin — silently ignore
      }
    },
    [iframeRef]
  );

  /**
   * Apply an inline CSS style to the selected element instantly,
   * then schedule a debounced Tailwind class write to the file.
   */
  const applyStyle = React.useCallback(
    (
      cssProperty: string,
      cssValue: string,
      tailwindPatch?: { classes: string[] }
    ) => {
      if (!selectedElement) return;

      // 1. Instant DOM update via postMessage
      postToIframe({
        type: "APPLY_STYLE",
        id: selectedElement.id,
        property: cssProperty,
        value: cssValue,
      });

      // 2. Debounced file write with Tailwind classes
      if (tailwindPatch) {
        if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
        writeTimerRef.current = setTimeout(() => {
          onUpdateElement(selectedElement.filePath, selectedElement.id, tailwindPatch);
        }, 350);
      }
    },
    [selectedElement, postToIframe, onUpdateElement]
  );

  /**
   * Apply/remove Tailwind classes instantly in the DOM + file.
   */
  const applyClass = React.useCallback(
    (add: string[], remove: string[]) => {
      if (!selectedElement) return;

      // 1. Instant DOM class update
      postToIframe({
        type: "APPLY_CLASS",
        id: selectedElement.id,
        add,
        remove,
      });

      // 2. Compute new class list and write to file
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
      writeTimerRef.current = setTimeout(() => {
        const currentClasses = selectedElement.classes ?? [];
        const next = [
          ...currentClasses.filter((c) => !remove.includes(c)),
          ...add.filter((a) => !currentClasses.includes(a)),
        ];
        onUpdateElement(selectedElement.filePath, selectedElement.id, {
          classes: next,
        });
      }, 350);
    },
    [selectedElement, postToIframe, onUpdateElement]
  );

  /**
   * Update text content of the selected element instantly in DOM + file.
   */
  const setText = React.useCallback(
    (text: string) => {
      if (!selectedElement) return;

      // 1. Instant DOM text update
      postToIframe({
        type: "SET_TEXT",
        id: selectedElement.id,
        text,
      });

      // 2. Debounced file write
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
      writeTimerRef.current = setTimeout(() => {
        onUpdateElement(selectedElement.filePath, selectedElement.id, { text });
      }, 350);
    },
    [selectedElement, postToIframe, onUpdateElement]
  );

  /**
   * Request a DOM tree snapshot from the iframe for the LayersPanel.
   */
  const requestDomTree = React.useCallback(() => {
    postToIframe({ type: "GET_DOM_TREE" });
  }, [postToIframe]);

  /**
   * Highlight (hover) an element in the iframe from the LayersPanel.
   */
  const hoverElement = React.useCallback(
    (id: string | null) => {
      postToIframe({ type: "HOVER_ELEMENT", id });
    },
    [postToIframe]
  );

  /**
   * Programmatically select an element in the iframe from the LayersPanel.
   */
  const selectElement = React.useCallback(
    (id: string | null) => {
      postToIframe({ type: "SELECT_ELEMENT", id });
    },
    [postToIframe]
  );

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    };
  }, []);

  return {
    applyStyle,
    applyClass,
    setText,
    requestDomTree,
    hoverElement,
    selectElement,
    postToIframe,
  };
}
