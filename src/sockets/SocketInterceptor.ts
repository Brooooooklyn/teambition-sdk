import { Database } from 'reactivedb'

import { clone, forEach } from '../utils'
import { MessageResult } from '../sockets/EventParser'

export type Flags = {
  mutateMessage?: boolean
}

export type UserFunc = (
  msg: MessageResult,
  db: Database,
  tabName: string,
  pkName: string
) => void | ControlFlow

export type Interceptor = (
  msg: MessageResult,
  db: Database,
  tabName: string,
  pkName: string
) => ControlFlow

type InterceptorCreator = (userFn: UserFunc) => Interceptor

export class Sequence {

  private interceptors: Interceptor[] = []

  append(userFn: UserFunc, options: Flags = {}) {
    this.interceptors.push(createInterceptor(userFn, options))
  }

  apply: Interceptor = (msg, db, tabName, pkName) => {
    let cf: ControlFlow = ControlFlow.PassThrough

    forEach(this.interceptors, (interceptor): void | false => {
      cf = interceptor(msg, db, tabName, pkName)

      if ((cf & ControlFlow.ShortCircuit) === ControlFlow.ShortCircuit) {
        return false
      }
    })

    return cf
  }
}

export enum ControlFlow {
  PassThrough = 0,
  ShortCircuit = 1 << 0,
  IgnoreDefaultDBOps = 1 << 1,
  ShortCircuitAndIgnoreDefaultDBOps = ShortCircuit | IgnoreDefaultDBOps,
}

export function createInterceptor(userFn: UserFunc, flags: Flags = {}): Interceptor {
  const create: InterceptorCreator = flags.mutateMessage ? mutateMessage : keepMessage

  return create(userFn)
}

const mutateMessage: InterceptorCreator = (userFn) =>
  (msg, db, tabName, pkName) => {
    const ret = userFn(msg, db, tabName, pkName)
    return typeof ret !== 'undefined' ? ret : ControlFlow.PassThrough
  }

const keepMessage: InterceptorCreator = (userFn) =>
  (msg, db, tabName, pkName) => {
    const msgClone = clone(msg)
    const ret = userFn(msgClone, db, tabName, pkName)
    return typeof ret !== 'undefined' ? ret : ControlFlow.PassThrough
  }
