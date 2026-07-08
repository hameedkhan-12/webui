export type GatewayMessageType =
  | 'UPDATE_PROP'
  | 'UPDATE_STYLE'
  | 'UPDATE_CHILDREN'
  | 'ADD_CLASS'
  | 'REMOVE_CLASS'

export interface GatewayBaseMessage {
  readonly type: GatewayMessageType
  readonly requestId?: string
}

export interface UpdatePropMessage extends GatewayBaseMessage {
  readonly type: 'UPDATE_PROP'
  readonly payload: {
    file: string
    line: number
    auraId: string
    prop: string
    value: unknown
  }
}

export interface UpdateStyleMessage extends GatewayBaseMessage {
  readonly type: 'UPDATE_STYLE'
  readonly payload: {
    file: string
    line: number
    auraId: string
    oldClass: string
    newClass: string
  }
}

export interface UpdateChildrenMessage extends GatewayBaseMessage {
  readonly type: 'UPDATE_CHILDREN'
  readonly payload: {
    file: string
    line: number
    auraId: string
    value: string
  }
}

export interface AddClassMessage extends GatewayBaseMessage {
  readonly type: 'ADD_CLASS'
  readonly payload: {
    file: string
    line: number
    auraId: string
    className: string
  }
}

export interface RemoveClassMessage extends GatewayBaseMessage {
  readonly type: 'REMOVE_CLASS'
  readonly payload: {
    file: string
    line: number
    auraId: string
    className: string
  }
}

export type GatewayMessage =
  | UpdatePropMessage
  | UpdateStyleMessage
  | UpdateChildrenMessage
  | AddClassMessage
  | RemoveClassMessage

export interface GatewayAckMessage {
  readonly type: 'ACK'
  readonly requestId?: string
}

export interface GatewayErrorMessage {
  readonly type: 'ERROR'
  readonly requestId?: string
  readonly error: string
}

export type GatewayResponseMessage = GatewayAckMessage | GatewayErrorMessage
