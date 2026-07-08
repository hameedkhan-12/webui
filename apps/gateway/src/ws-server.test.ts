import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { WebSocket } from 'ws'
import { WsServer } from './ws-server.js'
import { PersistenceService } from '@aura/persistence'
import type { IPersistenceAdapter } from '@repo/shared'

class MockAdapter implements IPersistenceAdapter {
  readonly name = 'mock'
  public calls: Array<{ type: string; op: Record<string, unknown> }> = []

  async updateProp(op: any): Promise<void> {
    this.calls.push({ type: 'updateProp', op })
  }

  async updateStyle(op: any): Promise<void> {
    this.calls.push({ type: 'updateStyle', op })
  }

  async updateChildren(op: any): Promise<void> {
    this.calls.push({ type: 'updateChildren', op })
  }

  async addClass(op: any): Promise<void> {
    this.calls.push({ type: 'addClass', op })
  }

  async removeClass(op: any): Promise<void> {
    this.calls.push({ type: 'removeClass', op })
  }
}

describe('WsServer', () => {
  let server: WsServer
  let port: number
  let client: WebSocket
  let adapter: MockAdapter
  let persistenceService: PersistenceService

  beforeEach(async () => {
    adapter = new MockAdapter()
    persistenceService = new PersistenceService(adapter)
    server = new WsServer({ persistenceService, installSignalHandlers: false })
    port = await server.start(0)
    client = new WebSocket(`ws://127.0.0.1:${port}`)
    await new Promise<void>((resolve) => client.once('open', () => resolve()))
  })

  afterEach(async () => {
    if (client.readyState === WebSocket.OPEN) {
      client.close()
      await new Promise<void>((resolve) => client.once('close', () => resolve()))
    }
    await server.shutdown()
  })

  it('should start and stop cleanly', async () => {
    expect(server.isRunning).toBe(true)
    expect(typeof port).toBe('number')
    await server.stop()
    expect(server.isRunning).toBe(false)
  })

  it('should route UPDATE_PROP messages to persistence.updateProp', async () => {
    const message = {
      type: 'UPDATE_PROP',
      requestId: 'req-1',
      payload: {
        file: 'src/Test.tsx',
        line: 1,
        auraId: 'aura-1',
        prop: 'title',
        value: 'Hello',
      },
    }

    const response = await new Promise<string>((resolve) => {
      client.once('message', (data) => resolve(data.toString()))
      client.send(JSON.stringify(message))
    })

    expect(JSON.parse(response)).toEqual({ type: 'ACK', requestId: 'req-1' })
    expect(adapter.calls).toEqual([{ type: 'updateProp', op: message.payload }])
  })

  it('should route UPDATE_STYLE messages to persistence.updateStyle', async () => {
    const message = {
      type: 'UPDATE_STYLE',
      requestId: 'req-2',
      payload: {
        file: 'src/Test.tsx',
        line: 2,
        auraId: 'aura-2',
        oldClass: 'bg-red-500',
        newClass: 'bg-blue-500',
      },
    }

    const response = await new Promise<string>((resolve) => {
      client.once('message', (data) => resolve(data.toString()))
      client.send(JSON.stringify(message))
    })

    expect(JSON.parse(response)).toEqual({ type: 'ACK', requestId: 'req-2' })
    expect(adapter.calls).toEqual([{ type: 'updateStyle', op: message.payload }])
  })

  it('should route UPDATE_CHILDREN messages to persistence.updateChildren', async () => {
    const message = {
      type: 'UPDATE_CHILDREN',
      requestId: 'req-3',
      payload: {
        file: 'src/Test.tsx',
        line: 3,
        auraId: 'aura-3',
        value: 'Updated children',
      },
    }

    const response = await new Promise<string>((resolve) => {
      client.once('message', (data) => resolve(data.toString()))
      client.send(JSON.stringify(message))
    })

    expect(JSON.parse(response)).toEqual({ type: 'ACK', requestId: 'req-3' })
    expect(adapter.calls).toEqual([{ type: 'updateChildren', op: message.payload }])
  })

  it('should route ADD_CLASS messages to persistence.addClass', async () => {
    const message = {
      type: 'ADD_CLASS',
      requestId: 'req-4',
      payload: {
        file: 'src/Test.tsx',
        line: 4,
        auraId: 'aura-4',
        className: 'new-class',
      },
    }

    const response = await new Promise<string>((resolve) => {
      client.once('message', (data) => resolve(data.toString()))
      client.send(JSON.stringify(message))
    })

    expect(JSON.parse(response)).toEqual({ type: 'ACK', requestId: 'req-4' })
    expect(adapter.calls).toEqual([{ type: 'addClass', op: message.payload }])
  })

  it('should route REMOVE_CLASS messages to persistence.removeClass', async () => {
    const message = {
      type: 'REMOVE_CLASS',
      requestId: 'req-5',
      payload: {
        file: 'src/Test.tsx',
        line: 5,
        auraId: 'aura-5',
        className: 'old-class',
      },
    }

    const response = await new Promise<string>((resolve) => {
      client.once('message', (data) => resolve(data.toString()))
      client.send(JSON.stringify(message))
    })

    expect(JSON.parse(response)).toEqual({ type: 'ACK', requestId: 'req-5' })
    expect(adapter.calls).toEqual([{ type: 'removeClass', op: message.payload }])
  })

  it('should respond with ERROR for invalid messages', async () => {
    const response = await new Promise<string>((resolve) => {
      client.once('message', (data) => resolve(data.toString()))
      client.send('invalid-json')
    })

    const parsed = JSON.parse(response)
    expect(parsed.type).toBe('ERROR')
    expect(parsed.error).toContain('Unexpected token')
  })

  it('should close cleanly when shutdown is called', async () => {
    await server.shutdown()
    expect(server.isRunning).toBe(false)
  })
})
