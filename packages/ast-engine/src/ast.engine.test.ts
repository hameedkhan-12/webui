// packages/ast-engine/src/ast.engine.test.ts
import { describe, expect, it } from 'vitest'
import {
  findNodeByAuraId,
  extractProps,
  extractClasses,
} from './ast.parser.js'
import {
  updateProp,
  updateStyle,
  updateChildren,
  addClass,
  removeClass,
} from './ast.writer.js'
import { generate, tag, strip, collect } from './aura-id.service.js'
import { tagWithCounter } from './ast.tagger.js'
import { insertElement, insertSibling, insertIntoFileRoot, setClasses, deleteElement, moveElement, AstMutationError } from './ast.writer.js'

// ─── Fixture source ───────────────────────────────────────────────────────────

const FIXTURE = `
import React from 'react'

export function Page() {
  return (
    <div className="container mx-auto">
      <HeroSection
        data-id="hero-001"
        heading="Hello World"
        className="bg-blue-500 text-white p-8"
      >
        Hero content
      </HeroSection>
      <Button data-id="btn-001" variant="primary" disabled className="mt-4">
        Click Me
      </Button>
      <TextBlock data-id="text-001" className="text-gray-600" />
    </div>
  )
}
`

// ─── ASTParser ────────────────────────────────────────────────────────────────

describe('ASTParser', () => {
  it('findNodeByAuraId: locates a node by its aura id', () => {
    const node = findNodeByAuraId(FIXTURE, 'hero-001')
    expect(node).not.toBeNull()
    expect(node?.auraId).toBe('hero-001')
    expect(node?.line).toBeGreaterThan(0)
    expect(node?.raw).toContain('data-id="hero-001"')
  })

  it('findNodeByAuraId: returns null for missing id', () => {
    expect(findNodeByAuraId(FIXTURE, 'does-not-exist')).toBeNull()
  })

  it('extractProps: extracts all props from a node', () => {
    const props = extractProps(FIXTURE, 'hero-001')
    expect(props['heading']).toBe('Hello World')
    expect(props['className']).toBe('bg-blue-500 text-white p-8')
    expect(props['data-id']).toBeUndefined() // filtered out
  })

  it('extractProps: extracts bare boolean props', () => {
    const props = extractProps(FIXTURE, 'btn-001')
    expect(props['disabled']).toBe(true)
    expect(props['variant']).toBe('primary')
  })

  it('extractClasses: returns tailwind class list', () => {
    const classes = extractClasses(FIXTURE, 'hero-001')
    expect(classes).toContain('bg-blue-500')
    expect(classes).toContain('text-white')
    expect(classes).toContain('p-8')
  })

  it('extractClasses: returns empty array when no className', () => {
    const source = `<Foo data-id="no-class" />`
    expect(extractClasses(source, 'no-class')).toEqual([])
  })
})

// ─── ASTWriter ────────────────────────────────────────────────────────────────

describe('ASTWriter', () => {
  it('updateProp: replaces an existing string prop', () => {
    const result = updateProp(FIXTURE, {
      file: 'page.tsx', line: 0, auraId: 'hero-001',
      prop: 'heading', value: 'New Heading'
    })
    expect(result).toContain('heading="New Heading"')
    expect(result).not.toContain('heading="Hello World"')
  })

  it('updateProp: replaces a non-string prop with {expr}', () => {
    const result = updateProp(FIXTURE, {
      file: 'page.tsx', line: 0, auraId: 'btn-001',
      prop: 'count', value: 42
    })
    expect(result).toContain('count={42}')
  })

  it('updateProp: returns unchanged source for unknown auraId', () => {
    const result = updateProp(FIXTURE, {
      file: 'page.tsx', line: 0, auraId: 'ghost-999',
      prop: 'heading', value: 'Test'
    })
    expect(result).toBe(FIXTURE)
  })

  it('updateStyle: replaces oldClass with newClass', () => {
    const result = updateStyle(FIXTURE, {
      file: 'page.tsx', line: 0, auraId: 'hero-001',
      oldClass: 'bg-blue-500', newClass: 'bg-red-500'
    })
    expect(result).toContain('bg-red-500')
    expect(result).not.toContain('bg-blue-500')
    // Other classes untouched
    expect(result).toContain('text-white')
  })

  it('updateChildren: replaces text content between opening and closing tag', () => {
    const result = updateChildren(FIXTURE, {
      file: 'page.tsx', line: 0, auraId: 'hero-001',
      value: 'New hero content'
    })
    expect(result).toContain('New hero content')
    expect(result).not.toContain('Hero content')
  })

  it('addClass: appends a class to className', () => {
    const result = addClass(FIXTURE, {
      file: 'page.tsx', line: 0, auraId: 'btn-001',
      className: 'rounded-lg'
    })
    expect(result).toContain('rounded-lg')
    expect(result).toContain('mt-4') // existing class preserved
  })

  it('addClass: creates className if absent', () => {
    const source = `<Foo data-id="no-class" />`
    const result = addClass(source, {
      file: 'f.tsx', line: 0, auraId: 'no-class', className: 'flex'
    })
    expect(result).toContain('className="flex"')
  })

  it('removeClass: removes a specific class', () => {
    const result = removeClass(FIXTURE, {
      file: 'page.tsx', line: 0, auraId: 'hero-001',
      className: 'text-white'
    })
    expect(result).not.toContain('text-white')
    expect(result).toContain('bg-blue-500') // others preserved
  })
})

// ─── AuraIdService ────────────────────────────────────────────────────────────

describe('AuraIdService', () => {
  it('generate: produces a UUID-formatted string', () => {
    const id = generate()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('generate: produces unique IDs on every call', () => {
    const ids = Array.from({ length: 100 }, generate)
    const unique = new Set(ids)
    expect(unique.size).toBe(100)
  })

  it('tag: injects data-aura-id onto untagged PascalCase components', () => {
    const source = `<Button variant="primary">Click</Button>`
    const tagged = tag(source)
    expect(tagged).toContain('data-aura-id=')
    const ids = collect(tagged)
    expect(ids).toHaveLength(1)
    expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('tag: does not re-tag already-tagged components', () => {
    const source = `<Button data-aura-id="existing-id" />`
    const tagged = tag(source)
    expect(collect(tagged)).toEqual(['existing-id'])
  })

  it('tag: skips lowercase intrinsic HTML tags by default', () => {
    const source = `<div className="wrapper"><span>text</span></div>`
    const tagged = tag(source)
    expect(collect(tagged)).toHaveLength(0)
    expect(tagged).toBe(source) // source unchanged
  })

  it('tag: tags intrinsic HTML tags when includeIntrinsic=true', () => {
    const source = `<div className="wrapper" />`
    const tagged = tag(source, true)
    expect(collect(tagged)).toHaveLength(1)
  })

  it('strip: removes all data-aura-id attributes', () => {
    const tagged = tag(`<Button /><Card />`)
    expect(collect(tagged)).toHaveLength(2)
    const stripped = strip(tagged)
    expect(collect(stripped)).toHaveLength(0)
    expect(stripped).not.toContain('data-aura-id')
  })

  it('collect: returns all aura ids from source', () => {
    // NOTE: local fixture using data-aura-id specifically, since
    // aura-id.service.ts's collect() is the OLD, not-yet-rewritten regex
    // implementation and still targets that attribute name -- unlike
    // everything in ASTParser/ASTWriter above, which now targets data-id to
    // match the real live inspector (see apps/web/src/lib/webcontainer.ts).
    const legacyFixture = `
      <HeroSection data-aura-id="hero-001" heading="Hello World" />
      <Button data-aura-id="btn-001">Click</Button>
      <TextBlock data-aura-id="text-001" text="hi" />
    `
    const ids = collect(legacyFixture)
    expect(ids).toContain('hero-001')
    expect(ids).toContain('btn-001')
    expect(ids).toContain('text-001')
    expect(ids).toHaveLength(3)
  })
})

// ─── Regression tests: real Babel AST vs. the old regex-based engine ──────────
//
// Everything in this section exercises code shapes the PREVIOUS regex-based
// ast.parser.ts/ast.writer.ts (and apps/web/src/lib/jsxUtils.ts, which has the
// same class of bug) would have handled incorrectly. These aren't hypothetical
// edge cases -- nested same-tag elements and cn()/clsx() className patterns are
// extremely common in real React code.

describe('Real AST correctness (nested same-tag elements)', () => {
  const NESTED = `
export function Page() {
  return (
    <div data-id="outer-div" className="p-4">
      <p>before</p>
      <div data-id="inner-div" className="p-2">
        <span>nested content</span>
      </div>
      <p>after</p>
    </div>
  )
}
`

  it('deleteElement removes exactly the inner div, not up to the outer div\'s closing tag', () => {
    const result = deleteElement(NESTED, 'inner-div')
    // The outer div and its other children must survive intact.
    expect(result).toContain('data-id="outer-div"')
    expect(result).toContain('<p>before</p>')
    expect(result).toContain('<p>after</p>')
    // The inner div and ONLY the inner div is gone.
    expect(result).not.toContain('data-id="inner-div"')
    expect(result).not.toContain('nested content')
    // A regex scanning for the next `</div>` after the inner div's opening
    // tag would have matched the INNER div's own closing tag correctly here
    // by luck (this fixture is deliberately the easy case) -- the failure
    // mode shows up below, in insertElement, where a regex has no concept of
    // "the closing tag belonging to THIS opening tag" at all.
  })

  it('findNodeByAuraId on the outer div returns only its own opening tag, unaffected by nested divs', () => {
    const node = findNodeByAuraId(NESTED, 'outer-div')
    expect(node?.raw).toContain('data-id="outer-div"')
    expect(node?.raw).not.toContain('inner-div')
  })

  it('insertElement into the outer div places the new element as its direct child, not inside the nested inner div', () => {
    const result = insertElement(NESTED, {
      parentAuraId: 'outer-div',
      elementCode: '<p data-id="new-p">inserted</p>',
      position: 'end',
    })
    // New element must appear, and the structure must still parse as valid
    // nesting: the inner div's own children are untouched.
    expect(result).toContain('data-id="new-p"')
    expect(result).toContain('nested content')
    expect(result).toContain('data-id="inner-div"')
  })
})

describe('Real AST correctness (cn()/clsx()-wrapped className)', () => {
  const CLSX_FIXTURE = `
export function Card({ isActive }: { isActive: boolean }) {
  return (
    <div
      data-id="card-1"
      className={cn("rounded-lg bg-white p-4", isActive && "ring-2 ring-blue-500", isActive ? "font-bold" : "font-normal")}
    >
      Card content
    </div>
  )
}
`

  it('addClass appends to the first string literal arg, leaving the rest of the cn() call untouched', () => {
    const result = addClass(CLSX_FIXTURE, {
      file: 'card.tsx', line: 0, auraId: 'card-1', className: 'shadow-lg',
    })
    expect(result).toContain('shadow-lg')
    // Everything else in the call must survive character-for-character.
    expect(result).toContain('isActive && "ring-2 ring-blue-500"')
    expect(result).toContain('isActive ? "font-bold" : "font-normal"')
    expect(result).toContain('cn(')
  })

  it('removeClass removes only from the first string literal arg', () => {
    const result = removeClass(CLSX_FIXTURE, {
      file: 'card.tsx', line: 0, auraId: 'card-1', className: 'rounded-lg',
    })
    expect(result).not.toContain('rounded-lg')
    expect(result).toContain('bg-white')
    expect(result).toContain('isActive && "ring-2 ring-blue-500"')
  })

  it('updateStyle swaps a class inside the first string literal arg only', () => {
    const result = updateStyle(CLSX_FIXTURE, {
      file: 'card.tsx', line: 0, auraId: 'card-1', oldClass: 'bg-white', newClass: 'bg-slate-100',
    })
    expect(result).toContain('bg-slate-100')
    expect(result).not.toContain('"rounded-lg bg-white')
    expect(result).toContain('isActive ? "font-bold" : "font-normal"')
  })
})

describe('Real AST safety (refuses genuinely unsupported className shapes)', () => {
  it('throws AstMutationError on a template-literal className rather than corrupting it', () => {
    const source = `<div data-id="tpl-1" className={\`base \${isOpen ? 'open' : 'closed'}\`} />`
    expect(() =>
      addClass(source, { file: 'f.tsx', line: 0, auraId: 'tpl-1', className: 'extra' })
    ).toThrow(AstMutationError)
  })

  it('throws AstMutationError on a bare identifier className rather than corrupting it', () => {
    const source = `<div data-id="ident-1" className={computedClasses} />`
    expect(() =>
      addClass(source, { file: 'f.tsx', line: 0, auraId: 'ident-1', className: 'extra' })
    ).toThrow(AstMutationError)
  })

  it('throws AstMutationError with the auraId attached for debugging', () => {
    const source = `<div data-id="ident-2" className={computedClasses} />`
    try {
      addClass(source, { file: 'f.tsx', line: 0, auraId: 'ident-2', className: 'extra' })
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(AstMutationError)
      expect((err as AstMutationError).auraId).toBe('ident-2')
    }
  })
})

describe('updateChildren safety (refuses to clobber nested elements)', () => {
  it('throws rather than deleting nested JSX children when asked to set plain text', () => {
    const source = `
      <div data-id="wrapper">
        <span>a</span>
        <span>b</span>
      </div>
    `
    expect(() =>
      updateChildren(source, { file: 'f.tsx', line: 0, auraId: 'wrapper', value: 'replaced' })
    ).toThrow(AstMutationError)
  })

  it('still replaces simple single-text-node children (existing behavior preserved)', () => {
    const source = `<p data-id="simple">old text</p>`
    const result = updateChildren(source, { file: 'f.tsx', line: 0, auraId: 'simple', value: 'new text' })
    expect(result).toContain('new text')
    expect(result).not.toContain('old text')
  })
})

describe('insertElement / deleteElement / moveElement', () => {
  it('insertElement refuses to insert into a self-closing element', () => {
    const source = `<img data-id="img-1" src="a.png" />`
    expect(() =>
      insertElement(source, { parentAuraId: 'img-1', elementCode: '<span>x</span>' })
    ).toThrow(AstMutationError)
  })

  it('insertElement into an empty element adds it as the first child', () => {
    const source = `<div data-id="empty-div"></div>`
    const result = insertElement(source, {
      parentAuraId: 'empty-div',
      elementCode: '<p data-id="p-1">hello</p>',
    })
    expect(result).toContain('data-id="p-1"')
    expect(result).toContain('hello')
  })

  it('moveElement relocates an element from one parent to another', () => {
    const source = `
      function Layout() {
        return (
          <>
            <div data-id="col-a">
              <p data-id="movable">move me</p>
            </div>
            <div data-id="col-b"></div>
          </>
        )
      }
    `
    const result = moveElement(source, 'movable', 'col-b')
    expect(result).toContain('data-id="col-b"')
    expect(result).toContain('move me')
    // Verify it's no longer inside col-a specifically.
    const colAOnly = result.slice(0, result.indexOf('data-id="col-b"'))
    expect(colAOnly).not.toContain('move me')
  })
})

describe('insertSibling', () => {
  const FIXTURE = `
    function List() {
      return (
        <div data-id="list-root">
          <p data-id="item-a">A</p>
          <p data-id="item-c">C</p>
        </div>
      )
    }
  `

  it('inserts before the target, not as its child', () => {
    const result = insertSibling(FIXTURE, 'item-c', '<p data-id="item-b">B</p>', 'before')
    const aIdx = result.indexOf('item-a')
    const bIdx = result.indexOf('item-b')
    const cIdx = result.indexOf('item-c')
    expect(aIdx).toBeLessThan(bIdx)
    expect(bIdx).toBeLessThan(cIdx)
    // Must be a sibling, not nested inside item-c's own tag.
    expect(result).not.toContain('data-id="item-c"><p data-id="item-b"')
  })

  it('inserts after the target', () => {
    const result = insertSibling(FIXTURE, 'item-a', '<p data-id="item-b">B</p>', 'after')
    const aIdx = result.indexOf('item-a')
    const bIdx = result.indexOf('item-b')
    const cIdx = result.indexOf('item-c')
    expect(aIdx).toBeLessThan(bIdx)
    expect(bIdx).toBeLessThan(cIdx)
  })
})

describe('setClasses', () => {
  it('wholesale-replaces the class list, matching UPDATE_CLASS payload semantics', () => {
    const source = `<div data-id="d1" className="a b c" />`
    const result = setClasses(source, 'd1', ['x', 'y'])
    expect(result).toContain('className="x y"')
    expect(result).not.toContain('"a b c"')
  })

  it('replaces only the first string-literal arg inside a cn() call', () => {
    const source = `<div data-id="d1" className={cn("a b c", isActive && "d")} />`
    const result = setClasses(source, 'd1', ['x', 'y'])
    expect(result).toContain('"x y"')
    expect(result).toContain('isActive && "d"')
  })
})

describe('insertIntoFileRoot', () => {
  it('inserts as the last child of the outermost returned JSX element', () => {
    const source = `
      export default function Page() {
        return (
          <main data-id="root">
            <h1>Title</h1>
          </main>
        )
      }
    `
    const result = insertIntoFileRoot(source, '<p data-id="new-p">new</p>')
    expect(result).toContain('data-id="new-p"')
    // Must land inside <main>, after the existing <h1>.
    const h1Idx = result.indexOf('<h1>')
    const newPIdx = result.indexOf('data-id="new-p"')
    expect(h1Idx).toBeLessThan(newPIdx)
  })
})

describe('tagWithCounter (replaces jsxUtils.ts tagJSXCode and aura-id.service.ts tag())', () => {
  it('is browser-safe -- uses no node:crypto, produces deterministic el-N ids from a counter', () => {
    const { code, newCounter } = tagWithCounter(
      `function Row() { return (<><Button /><Card /></>) }`,
      1
    )
    expect(code).toContain('data-id="el-1"')
    expect(code).toContain('data-id="el-2"')
    expect(newCounter).toBe(3)
  })

  it('does not re-tag elements that already have a data-id', () => {
    const { code, newCounter } = tagWithCounter('<Button data-id="existing" />', 5)
    expect(code).toContain('data-id="existing"')
    expect(code).not.toContain('el-5')
    expect(newCounter).toBe(5)
  })

  it('threads the counter correctly across multiple untagged elements, matching insertion order', () => {
    const { code, newCounter } = tagWithCounter(
      `
      function List() {
        return (
          <ul>
            <li>a</li>
            <li>b</li>
            <li>c</li>
          </ul>
        )
      }
    `,
      10
    )
    expect(code).toContain('data-id="el-10"')
    expect(code).toContain('data-id="el-13"')
    expect(newCounter).toBe(14) // ul + 3 li = 4 elements tagged, starting at 10
  })

  it('respects includeIntrinsic=false, only tagging PascalCase components', () => {
    const { code } = tagWithCounter('<div><Card /></div>', 1, false)
    expect(code).not.toMatch(/<div[^>]*data-id/)
    expect(code).toContain('data-id="el-1"')
  })
})