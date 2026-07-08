import type { PersistenceService } from '@aura/persistence'
import type {
  GatewayMessage,
  UpdatePropMessage,
  UpdateStyleMessage,
  UpdateChildrenMessage,
  AddClassMessage,
  RemoveClassMessage,
} from './messages.js'

export abstract class GatewayMessageHandler<M extends GatewayMessage> {
  constructor(protected persistence: PersistenceService) {
    if (!persistence) {
      throw new Error('GatewayMessageHandler: persistence service is required')
    }
  }

  abstract readonly type: M['type']
  abstract handle(message: M): Promise<void>
}

export class UpdatePropHandler extends GatewayMessageHandler<UpdatePropMessage> {
  readonly type = 'UPDATE_PROP'

  async handle(message: UpdatePropMessage): Promise<void> {
    await this.persistence.updateProp(message.payload)
  }
}

export class UpdateStyleHandler extends GatewayMessageHandler<UpdateStyleMessage> {
  readonly type = 'UPDATE_STYLE'

  async handle(message: UpdateStyleMessage): Promise<void> {
    await this.persistence.updateStyle(message.payload)
  }
}

export class UpdateChildrenHandler extends GatewayMessageHandler<UpdateChildrenMessage> {
  readonly type = 'UPDATE_CHILDREN'

  async handle(message: UpdateChildrenMessage): Promise<void> {
    await this.persistence.updateChildren(message.payload)
  }
}

export class AddClassHandler extends GatewayMessageHandler<AddClassMessage> {
  readonly type = 'ADD_CLASS'

  async handle(message: AddClassMessage): Promise<void> {
    await this.persistence.addClass(message.payload)
  }
}

export class RemoveClassHandler extends GatewayMessageHandler<RemoveClassMessage> {
  readonly type = 'REMOVE_CLASS'

  async handle(message: RemoveClassMessage): Promise<void> {
    await this.persistence.removeClass(message.payload)
  }
}

export function createHandler(
  message: GatewayMessage,
  persistence: PersistenceService
): GatewayMessageHandler<GatewayMessage> {
  switch (message.type) {
    case 'UPDATE_PROP':
      return new UpdatePropHandler(persistence)
    case 'UPDATE_STYLE':
      return new UpdateStyleHandler(persistence)
    case 'UPDATE_CHILDREN':
      return new UpdateChildrenHandler(persistence)
    case 'ADD_CLASS':
      return new AddClassHandler(persistence)
    case 'REMOVE_CLASS':
      return new RemoveClassHandler(persistence)
    default: {
      const exhaustiveCheck: never = message
      throw new Error('Unsupported gateway message type')
    }
  }
}
