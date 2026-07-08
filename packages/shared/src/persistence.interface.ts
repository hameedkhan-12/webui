export interface IPersistenceAdapter {
  readonly name: string
  updateProp(op: UpdatePropOperation): Promise<void>
  updateStyle(op: UpdateStyleOperation): Promise<void>
  updateChildren(op: UpdateChildrenOperation): Promise<void>
  addClass(op: AddClassOperation): Promise<void>
  removeClass(op: RemoveClassOperation): Promise<void>
}

export interface BaseOperation {
  readonly file: string
  readonly line: number
  readonly auraId: string
}

export interface UpdatePropOperation extends BaseOperation {
  readonly prop: string
  readonly value: unknown
}

export interface UpdateStyleOperation extends BaseOperation {
  readonly oldClass: string
  readonly newClass: string
}

export interface UpdateChildrenOperation extends BaseOperation {
  readonly value: string
}

export interface AddClassOperation extends BaseOperation {
  readonly className: string
}

export interface RemoveClassOperation extends BaseOperation {
  readonly className: string
}
