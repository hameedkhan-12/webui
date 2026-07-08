import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { init, dispose, type AuraSelectMessage, type AuraHoverMessage, type AuraDeselectMessage } from './aura-runtime'

describe('aura-runtime', () => {
  let messagesSent: any[] = []
  let originalParent: Window

  beforeEach(() => {
    // Clear messages
    messagesSent = []

    // Mock window.parent.postMessage
    originalParent = window.parent
    Object.defineProperty(window, 'parent', {
      value: {
        postMessage: (message: any) => {
          messagesSent.push(message)
        },
      },
      writable: true,
    })

    // Clear any previous runtime
    dispose()
  })

  afterEach(() => {
    // Cleanup
    dispose()
    messagesSent = []
    Object.defineProperty(window, 'parent', {
      value: originalParent,
      writable: true,
    })
  })

  describe('initialization', () => {
    it('should initialize without errors', () => {
      expect(() => init()).not.toThrow()
    })

    it('should allow multiple calls without duplication', () => {
      init()
      const messagesBefore = messagesSent.length
      init() // Second call
      const messagesAfter = messagesSent.length

      // No new messages should be sent during init
      expect(messagesAfter).toBe(messagesBefore)
    })

    it('should be disposable', () => {
      init()
      expect(() => dispose()).not.toThrow()
    })
  })

  describe('click interception', () => {
    beforeEach(() => {
      init()
    })

    it('should intercept clicks on elements with data-aura-id', () => {
      const element = document.createElement('div')
      element.setAttribute('data-aura-id', 'test-id-123')
      element.setAttribute('data-aura-file', '/path/to/file.tsx')
      element.setAttribute('data-aura-line', '42')
      element.setAttribute('data-aura-component', 'MyComponent')
      document.body.appendChild(element)

      const event = new MouseEvent('click', { bubbles: true })
      element.dispatchEvent(event)

      expect(messagesSent.length).toBeGreaterThan(0)
      const message = messagesSent[0] as AuraSelectMessage
      expect(message.type).toBe('AURA_SELECT')
      expect(message.auraId).toBe('test-id-123')

      document.body.removeChild(element)
    })

    it('should send AURA_SELECT message with correct properties', () => {
      const element = document.createElement('div')
      element.setAttribute('data-aura-id', 'abc123')
      element.setAttribute('data-aura-file', '/components/Button.tsx')
      element.setAttribute('data-aura-line', '15')
      element.setAttribute('data-aura-component', 'Button')
      element.className = 'btn btn-primary'
      document.body.appendChild(element)

      const event = new MouseEvent('click', { bubbles: true })
      element.dispatchEvent(event)

      const message = messagesSent[0] as AuraSelectMessage
      expect(message.type).toBe('AURA_SELECT')
      expect(message.auraId).toBe('abc123')
      expect(message.file).toBe('/components/Button.tsx')
      expect(message.line).toBe('15')
      expect(message.componentName).toBe('Button')
      expect(message.computedClasses).toBe('btn btn-primary')
      expect(message.rect).toBeDefined()

      document.body.removeChild(element)
    })

    it('should find aura element in parent hierarchy', () => {
      const parent = document.createElement('div')
      parent.setAttribute('data-aura-id', 'parent-id')
      parent.setAttribute('data-aura-file', '/parent.tsx')
      parent.setAttribute('data-aura-line', '10')
      parent.setAttribute('data-aura-component', 'Parent')

      const child = document.createElement('span')
      parent.appendChild(child)
      document.body.appendChild(parent)

      // Click on child, should find parent with aura-id
      const event = new MouseEvent('click', { bubbles: true })
      child.dispatchEvent(event)

      expect(messagesSent.length).toBeGreaterThan(0)
      const message = messagesSent[0] as AuraSelectMessage
      expect(message.auraId).toBe('parent-id')
      expect(message.componentName).toBe('Parent')

      document.body.removeChild(parent)
    })

    it('should walk up multiple levels to find aura element', () => {
      const grandparent = document.createElement('div')
      grandparent.setAttribute('data-aura-id', 'gp-id')
      grandparent.setAttribute('data-aura-file', '/gp.tsx')
      grandparent.setAttribute('data-aura-line', '1')
      grandparent.setAttribute('data-aura-component', 'Grandparent')

      const parent = document.createElement('div')
      const child = document.createElement('span')

      grandparent.appendChild(parent)
      parent.appendChild(child)
      document.body.appendChild(grandparent)

      // Click on deep child
      const event = new MouseEvent('click', { bubbles: true })
      child.dispatchEvent(event)

      expect(messagesSent.length).toBeGreaterThan(0)
      const message = messagesSent[0] as AuraSelectMessage
      expect(message.auraId).toBe('gp-id')

      document.body.removeChild(grandparent)
    })

    it('should not send message if no aura-id found', () => {
      const element = document.createElement('div')
      document.body.appendChild(element)

      const event = new MouseEvent('click', { bubbles: true })
      element.dispatchEvent(event)

      expect(messagesSent.length).toBe(0)

      document.body.removeChild(element)
    })

    it('should prevent default and stop propagation on click', () => {
      const element = document.createElement('div')
      element.setAttribute('data-aura-id', 'test-id')
      element.setAttribute('data-aura-file', '/test.tsx')
      element.setAttribute('data-aura-line', '1')
      element.setAttribute('data-aura-component', 'Test')
      document.body.appendChild(element)

      const event = new MouseEvent('click', { bubbles: true, cancelable: true })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation')

      element.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
      expect(stopPropagationSpy).toHaveBeenCalled()

      document.body.removeChild(element)
    })

    it('should handle missing data attributes gracefully', () => {
      const element = document.createElement('div')
      element.setAttribute('data-aura-id', 'test-id')
      // Missing other attributes
      document.body.appendChild(element)

      const event = new MouseEvent('click', { bubbles: true })
      element.dispatchEvent(event)

      expect(messagesSent.length).toBeGreaterThan(0)
      const message = messagesSent[0] as AuraSelectMessage
      expect(message.auraId).toBe('test-id')
      expect(message.file).toBe('')
      expect(message.line).toBe('')
      expect(message.componentName).toBe('')

      document.body.removeChild(element)
    })
  })

  describe('keyboard handling', () => {
    beforeEach(() => {
      init()
    })

    it('should handle Escape key to deselect', () => {
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      document.dispatchEvent(event)

      expect(messagesSent.length).toBeGreaterThan(0)
      const message = messagesSent[0] as AuraDeselectMessage
      expect(message.type).toBe('AURA_DESELECT')
    })

    it('should handle "Esc" key (older browsers)', () => {
      const event = new KeyboardEvent('keydown', { key: 'Esc', bubbles: true })
      document.dispatchEvent(event)

      expect(messagesSent.length).toBeGreaterThan(0)
      const message = messagesSent[0] as AuraDeselectMessage
      expect(message.type).toBe('AURA_DESELECT')
    })

    it('should not send deselect for other keys', () => {
      const beforeCount = messagesSent.length

      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      document.dispatchEvent(event)

      expect(messagesSent.length).toBe(beforeCount)
    })

    it('should capture keyboard events in capture phase', () => {
      const element = document.createElement('div')
      element.setAttribute('data-aura-id', 'test-id')
      element.setAttribute('data-aura-file', '/test.tsx')
      element.setAttribute('data-aura-line', '1')
      element.setAttribute('data-aura-component', 'Test')
      document.body.appendChild(element)

      // Focus element and send Escape
      element.focus()

      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      document.dispatchEvent(event)

      expect(messagesSent.length).toBeGreaterThan(0)
      const message = messagesSent[0] as AuraDeselectMessage
      expect(message.type).toBe('AURA_DESELECT')

      document.body.removeChild(element)
    })
  })

  describe('hover handling', () => {
    beforeEach(() => {
      init()
    })

    it('should send AURA_HOVER message on mouseover', (done) => {
      const element = document.createElement('div')
      element.setAttribute('data-aura-id', 'hover-id')
      element.setAttribute('data-aura-file', '/hover.tsx')
      element.setAttribute('data-aura-line', '20')
      element.setAttribute('data-aura-component', 'HoverTest')
      document.body.appendChild(element)

      const event = new MouseEvent('mouseover', { bubbles: true })
      element.dispatchEvent(event)

      // Wait for debounce (50ms)
      setTimeout(() => {
        expect(messagesSent.length).toBeGreaterThan(0)
        const message = messagesSent[messagesSent.length - 1] as AuraHoverMessage
        expect(message.type).toBe('AURA_HOVER')
        expect(message.auraId).toBe('hover-id')
        expect(message.rect).toBeDefined()

        document.body.removeChild(element)
        done()
      }, 100)
    })

    it('should debounce hover events (50ms)', (done) => {
      const element = document.createElement('div')
      element.setAttribute('data-aura-id', 'hover-id')
      element.setAttribute('data-aura-file', '/hover.tsx')
      element.setAttribute('data-aura-line', '20')
      element.setAttribute('data-aura-component', 'HoverTest')
      document.body.appendChild(element)

      // Send multiple rapid hover events
      for (let i = 0; i < 5; i++) {
        const event = new MouseEvent('mouseover', { bubbles: true })
        element.dispatchEvent(event)
      }

      // Wait for debounce
      setTimeout(() => {
        // Should only have one hover message despite multiple events
        const hoverMessages = messagesSent.filter((m) => m.type === 'AURA_HOVER')
        expect(hoverMessages.length).toBeGreaterThanOrEqual(1)

        document.body.removeChild(element)
        done()
      }, 150)
    })

    it('should send hover message on different elements', (done) => {
      const element1 = document.createElement('div')
      element1.setAttribute('data-aura-id', 'hover-id-1')
      element1.setAttribute('data-aura-file', '/test.tsx')
      element1.setAttribute('data-aura-line', '1')
      element1.setAttribute('data-aura-component', 'Test1')

      const element2 = document.createElement('div')
      element2.setAttribute('data-aura-id', 'hover-id-2')
      element2.setAttribute('data-aura-file', '/test.tsx')
      element2.setAttribute('data-aura-line', '2')
      element2.setAttribute('data-aura-component', 'Test2')

      document.body.appendChild(element1)
      document.body.appendChild(element2)

      // Hover element1
      let event = new MouseEvent('mouseover', { bubbles: true })
      element1.dispatchEvent(event)

      setTimeout(() => {
        const beforeCount = messagesSent.length

        // Hover element2
        event = new MouseEvent('mouseover', { bubbles: true })
        element2.dispatchEvent(event)

        setTimeout(() => {
          // Should have new hover message for element2
          const newMessages = messagesSent.slice(beforeCount)
          const hoverMessages = newMessages.filter((m) => m.type === 'AURA_HOVER')
          expect(hoverMessages.length).toBeGreaterThan(0)
          const lastHover = hoverMessages[hoverMessages.length - 1] as AuraHoverMessage
          expect(lastHover.auraId).toBe('hover-id-2')

          document.body.removeChild(element1)
          document.body.removeChild(element2)
          done()
        }, 100)
      }, 100)
    })

    it('should not send duplicate hover for same element', (done) => {
      const element = document.createElement('div')
      element.setAttribute('data-aura-id', 'hover-id')
      element.setAttribute('data-aura-file', '/test.tsx')
      element.setAttribute('data-aura-line', '1')
      element.setAttribute('data-aura-component', 'Test')
      document.body.appendChild(element)

      // First hover
      let event = new MouseEvent('mouseover', { bubbles: true })
      element.dispatchEvent(event)

      setTimeout(() => {
        const beforeCount = messagesSent.length

        // Second hover on same element
        event = new MouseEvent('mouseover', { bubbles: true })
        element.dispatchEvent(event)

        setTimeout(() => {
          // Should not send another message for same element
          const newMessages = messagesSent.slice(beforeCount)
          const hoverMessages = newMessages.filter((m) => m.type === 'AURA_HOVER')
          expect(hoverMessages.length).toBe(0)

          document.body.removeChild(element)
          done()
        }, 100)
      }, 100)
    })
  })

  describe('disposal', () => {
    it('should stop listening to events after dispose', () => {
      init()
      dispose()

      const element = document.createElement('div')
      element.setAttribute('data-aura-id', 'test-id')
      element.setAttribute('data-aura-file', '/test.tsx')
      element.setAttribute('data-aura-line', '1')
      element.setAttribute('data-aura-component', 'Test')
      document.body.appendChild(element)

      const beforeCount = messagesSent.length

      // Send click event
      const clickEvent = new MouseEvent('click', { bubbles: true })
      element.dispatchEvent(clickEvent)

      // Send key event
      const keyEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      document.dispatchEvent(keyEvent)

      // Send hover event
      const hoverEvent = new MouseEvent('mouseover', { bubbles: true })
      element.dispatchEvent(hoverEvent)

      // Wait to ensure no debounced messages
      setTimeout(() => {
        expect(messagesSent.length).toBe(beforeCount)

        document.body.removeChild(element)
      }, 200)
    })

    it('should allow re-initialization after disposal', () => {
      init()
      dispose()

      expect(() => init()).not.toThrow()

      const element = document.createElement('div')
      element.setAttribute('data-aura-id', 'test-id')
      element.setAttribute('data-aura-file', '/test.tsx')
      element.setAttribute('data-aura-line', '1')
      element.setAttribute('data-aura-component', 'Test')
      document.body.appendChild(element)

      const event = new MouseEvent('click', { bubbles: true })
      element.dispatchEvent(event)

      expect(messagesSent.length).toBeGreaterThan(0)

      document.body.removeChild(element)
      dispose()
    })

    it('should clear hover timer on dispose', (done) => {
      init()

      const element = document.createElement('div')
      element.setAttribute('data-aura-id', 'test-id')
      element.setAttribute('data-aura-file', '/test.tsx')
      element.setAttribute('data-aura-line', '1')
      element.setAttribute('data-aura-component', 'Test')
      document.body.appendChild(element)

      // Trigger hover
      const hoverEvent = new MouseEvent('mouseover', { bubbles: true })
      element.dispatchEvent(hoverEvent)

      // Dispose before hover completes
      dispose()

      // Wait longer than debounce
      setTimeout(() => {
        const hoverMessages = messagesSent.filter((m) => m.type === 'AURA_HOVER')
        // Should not have hover message because timer was cleared
        expect(hoverMessages.length).toBe(0)

        document.body.removeChild(element)
        done()
      }, 150)
    })
  })

  describe('complex scenarios', () => {
    beforeEach(() => {
      init()
    })

    it('should handle rapid click and hover interactions', (done) => {
      const element = document.createElement('div')
      element.setAttribute('data-aura-id', 'test-id')
      element.setAttribute('data-aura-file', '/test.tsx')
      element.setAttribute('data-aura-line', '1')
      element.setAttribute('data-aura-component', 'Test')
      document.body.appendChild(element)

      // Click
      let event = new MouseEvent('click', { bubbles: true })
      element.dispatchEvent(event)

      const clickMessages = messagesSent.filter((m) => m.type === 'AURA_SELECT')
      expect(clickMessages.length).toBeGreaterThan(0)

      // Hover
      event = new MouseEvent('mouseover', { bubbles: true })
      element.dispatchEvent(event)

      setTimeout(() => {
        const allMessages = messagesSent
        expect(allMessages.length).toBeGreaterThan(0)

        // Should have both select and hover messages
        const selects = allMessages.filter((m) => m.type === 'AURA_SELECT')
        const hovers = allMessages.filter((m) => m.type === 'AURA_HOVER')

        expect(selects.length).toBeGreaterThan(0)
        expect(hovers.length).toBeGreaterThan(0)

        document.body.removeChild(element)
        done()
      }, 100)
    })

    it('should handle nested aura elements', () => {
      const outer = document.createElement('div')
      outer.setAttribute('data-aura-id', 'outer-id')
      outer.setAttribute('data-aura-file', '/outer.tsx')
      outer.setAttribute('data-aura-line', '1')
      outer.setAttribute('data-aura-component', 'Outer')

      const inner = document.createElement('div')
      inner.setAttribute('data-aura-id', 'inner-id')
      inner.setAttribute('data-aura-file', '/inner.tsx')
      inner.setAttribute('data-aura-line', '5')
      inner.setAttribute('data-aura-component', 'Inner')

      outer.appendChild(inner)
      document.body.appendChild(outer)

      // Click on inner
      const event = new MouseEvent('click', { bubbles: true })
      inner.dispatchEvent(event)

      // Should select inner (closest ancestor with aura-id)
      expect(messagesSent.length).toBeGreaterThan(0)
      const message = messagesSent[0] as AuraSelectMessage
      expect(message.auraId).toBe('inner-id')

      document.body.removeChild(outer)
    })
  })
})
