'use client';

import { useEffect } from 'react';
import { bootstrapAura } from '@aura/blocks';

/**
 * Boots the Aura component/schema registries once, near the root of the app.
 *
 * Phase 1 scope only: this registers the built-in block library
 * (Button, TextBlock, Hero, Section, Container, Grid, Card, Image, Nav,
 * Footer, Form, Spacer) into ComponentRegistry and SchemaRegistry via the
 * AuraKernel. Nothing in the app renders from this yet -- no page mounts
 * <Canvas>/<BlockRenderer> from @aura/renderer, and useWorkspace.ts's AI/file
 * pipeline does not consume these registries yet either. That wiring is
 * Phase 2/3's job.
 *
 * bootstrapAura() is an idempotent module-level singleton (see
 * packages/blocks/src/bootstrap.ts), so calling it more than once -- e.g.
 * across React Strict Mode's double-invoke in dev, or HMR -- is safe and
 * returns the existing runtime instead of re-mounting.
 */
export function AuraBootstrap() {
  useEffect(() => {
    let cancelled = false;

    bootstrapAura()
      .then((runtime) => {
        if (cancelled) return;
        if (process.env.NODE_ENV !== 'production') {
          console.info(
            `[Aura] Registries booted: ${runtime.components.size} components registered (${runtime.components
              .keys()
              .join(', ')}).`
          );
        }
      })
      .catch((error) => {
        // Fail open: the rest of the app doesn't depend on this yet, so a
        // boot failure here shouldn't take down the editor. Surface it
        // loudly so it isn't silently ignored once Phase 2/3 do depend on it.
        console.error('[Aura] Failed to boot component/schema registries:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}