import fs from 'fs/promises';
import path from 'path';
import { WebSocketServer, type WebSocket } from 'ws'
import { fileWriteQueue } from './queue/file-write.queue.js'
import {
  ASTPersistenceAdapter,
  InMemorySourceCache,
  type IFileWriter,
  PersistenceService,
} from '@aura/persistence'
import type { GatewayMessage, GatewayResponseMessage } from './messages.js'
import { createHandler } from './handlers.js'

export interface WsServerOptions {
  port?: number
  root?: string
  persistenceService?: PersistenceService
  installSignalHandlers?: boolean
}

class FsFileWriter implements IFileWriter {
  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content, 'utf-8')
  }
}

export class WsServer {
  private wss: WebSocketServer | null = null
  private clients = new Set<WebSocket>()
  private shouldShutdown = false
  private signalHandlers: Array<() => void> = []
  private persistenceService: PersistenceService
  private root: string
  private installSignalHandlers: boolean

  constructor(options: WsServerOptions = {}) {
    this.root = options.root ?? process.cwd()
    this.installSignalHandlers = options.installSignalHandlers ?? true
    this.persistenceService =
      options.persistenceService ??
      new PersistenceService(
        new ASTPersistenceAdapter(new InMemorySourceCache(), new FsFileWriter(), fileWriteQueue)
      )

    if (this.installSignalHandlers) {
      this.installShutdownHandlers()
    }
  }

  private installShutdownHandlers(): void {
    const createHandler = (signal: string) => {
      const handler = () => {
        void this.shutdown().catch((error) => {
          console.error(`WsServer: Failed to shutdown after ${signal}`, error)
          process.exit(1)
        })
      }
      process.on(signal, handler)
      this.signalHandlers.push(() => process.off(signal, handler))
    }

    createHandler('SIGINT')
    createHandler('SIGTERM')
  }

  private uninstallShutdownHandlers(): void {
    this.signalHandlers.forEach((remove) => remove())
    this.signalHandlers = []
  }

  public async start(port = 0): Promise<number> {
    if (this.wss) {
      throw new Error('WsServer: already started')
    }

    this.wss = new WebSocketServer({ port })
    this.wss.on('connection', (socket: WebSocket) => this.handleConnection(socket))
    this.wss.on('error', (error: Error) => console.error('WsServer error:', error))

    await new Promise<void>((resolve, reject) => {
      if (!this.wss) {
        reject(new Error('WsServer: failed to create server'))
        return
      }
      this.wss.once('listening', resolve)
      this.wss.once('error', reject)
    })

    const address = this.wss.address()
    if (address && typeof address === 'object') {
      return address.port
    }
    throw new Error('WsServer: could not determine listening port')
  }

  public async shutdown(): Promise<void> {
    if (this.shouldShutdown) {
      return
    }
    this.shouldShutdown = true

    await this.stop()
    this.uninstallShutdownHandlers()
  }

  public async stop(): Promise<void> {
    if (!this.wss) {
      return
    }

    for (const client of this.clients) {
      client.close(1001, 'Server shutting down')
    }
    this.clients.clear()

    await new Promise<void>((resolve, reject) => {
      this.wss?.close((error: Error | undefined) => {
        if (error) reject(error)
        else resolve()
      })
    })

    this.wss = null
  }

  public get isRunning(): boolean {
    return this.wss !== null
  }

  public get port(): number | null {
    if (!this.wss) return null
    const address = this.wss.address()
    return address && typeof address === 'object' ? address.port : null
  }

  private handleConnection(socket: WebSocket): void {
    this.clients.add(socket)
    socket.on('message', (data: unknown) => {
      const raw = typeof data === 'string' ? data : data instanceof Uint8Array ? new TextDecoder().decode(data) : String(data)
      this.handleMessage(socket, raw)
    })
    socket.on('close', () => this.clients.delete(socket))
    socket.on('error', () => this.clients.delete(socket))
  }

  private async handleMessage(socket: WebSocket, raw: string): Promise<void> {
    let message: GatewayMessage
    try {
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') {
        throw new Error('Invalid message payload')
      }
      message = parsed as GatewayMessage
    } catch (error) {
      const response: GatewayResponseMessage = {
        type: 'ERROR',
        error: (error as Error).message,
      }
      this.send(socket, response)
      return
    }

    try {
      const handler = createHandler(message, this.persistenceService)
      await handler.handle(message)
      const response: GatewayResponseMessage =
        message.requestId !== undefined
          ? { type: 'ACK', requestId: message.requestId }
          : { type: 'ACK' }
      this.send(socket, response)
    } catch (error) {
      const response: GatewayResponseMessage =
        message.requestId !== undefined
          ? { type: 'ERROR', requestId: message.requestId, error: (error as Error).message }
          : { type: 'ERROR', error: (error as Error).message }
      this.send(socket, response)
    }
  }

  private send(socket: WebSocket, message: GatewayResponseMessage): void {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(message))
    }
  }

  public async loadSourceFile(filePath: string): Promise<void> {
    const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(this.root, filePath)
    const source = await fs.readFile(absolute, 'utf-8')
    const adapter = this.getAstAdapter()
    adapter.loadSourceFile(absolute, source)
  }

  private getAstAdapter(): ASTPersistenceAdapter {
    const serviceImpl = this.persistenceService as any
    if (serviceImpl?.adapter && serviceImpl.adapter instanceof ASTPersistenceAdapter) {
      return serviceImpl.adapter
    }
    throw new Error('WsServer: underlying persistence service is not ASTPersistenceAdapter')
  }
}
