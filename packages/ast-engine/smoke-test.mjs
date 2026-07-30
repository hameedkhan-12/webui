// packages/ast-engine/smoke-test.mjs
/**
 * Plain-Node smoke test -- deliberately NOT run through Vitest.
 *
 * Context: a real bug (@babel/traverse's CJS/ESM interop resolving to a
 * non-callable value, throwing "traverse is not a function" at actual
 * runtime) passed all 45 of this package's Vitest tests, because Vitest's
 * own module transform normalizes the CJS/ESM interop differently than a
 * plain `node --input-type=module` execution does -- which is closer to
 * what a real consuming app's bundler/runtime actually sees.
 *
 * This script exercises the built dist/ output directly under plain Node
 * ESM, against code shaped like real AI-generated output (hooks, TS
 * interfaces, imports, .map(), conditional classNames) -- not the small
 * hand-crafted fixtures in ast.engine.test.ts. Run after every build:
 *   node packages/ast-engine/smoke-test.mjs
 */
import { tagWithCounter } from './dist/ast.tagger.js';
import { findNodeByAuraId } from './dist/ast.parser.js';
import { addClass } from './dist/ast.writer.js';

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`  ok - ${label}`);
  } else {
    console.error(`  FAIL - ${label}`);
    failures++;
  }
}

const realisticAiCode = `'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface Task {
  id: string;
  text: string;
  done: boolean;
}

export default function TaskMaster() {
  const [tasks, setTasks] = useState<Task[]>([{ id: '1', text: 'Buy milk', done: false }]);
  const [input, setInput] = useState('');

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-bold">Task Master</h1>
      </header>
      <section className="max-w-2xl mx-auto">
        <ul className="mt-6 space-y-2">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between rounded-xl bg-white/5 p-4">
              <span className={task.done ? 'line-through opacity-50' : ''}>{task.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
`;

console.log('Smoke test: tagWithCounter against realistic AI-generated code');
const result = tagWithCounter(realisticAiCode, 1);
check('parsing did not silently fail (code actually changed)', result.code !== realisticAiCode);
check('tagged more than 5 elements', (result.code.match(/data-id=/g) || []).length > 5);
check('counter advanced', result.newCounter > 1);

console.log('Smoke test: findNodeByAuraId on freshly-tagged output');
const node = findNodeByAuraId(result.code, 'el-1');
check('can find a freshly-tagged element', node !== null);

console.log('Smoke test: addClass on freshly-tagged output');
if (node) {
  const mutated = addClass(result.code, { file: 'x.tsx', line: 0, auraId: 'el-1', className: 'shadow-xl' });
  check('addClass actually changed the source', mutated !== result.code);
  check('new class present', mutated.includes('shadow-xl'));
}

if (failures > 0) {
  console.error(`\n${failures} smoke test(s) FAILED.`);
  process.exit(1);
} else {
  console.log('\nAll smoke tests passed.');
}
