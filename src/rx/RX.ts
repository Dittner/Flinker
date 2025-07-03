import { type RXAnyOperatorProtocol } from './RXOperator'
import {
  type AnyRXObservable,
  RXCombine,
  RXDelayedComplete,
  RXDelayedError,
  RXFrom,
  RXJustComplete,
  RXJustError,
  type RXObservable,
  RXQueue,
  RXWaitUntilComplete
} from './RXPublisher'

export type RXObjectType = 'operator' | 'observable' | 'pipeline' | 'object'

export interface RXObject {
  type: RXObjectType
}

export type RXAnySender = RXSender<any, any>

export interface RXSender<V, E> {
  send(value: V, broadcast: boolean): void
  sendError(e: E, broadcast: boolean): void
  sendComplete(broadcast: boolean): void
}

export class RX {
  static combine(...list: Array<AnyRXObservable | RXAnyOperatorProtocol>): RXObservable<any[], any> {
    return new RXCombine(list).asObservable
  }

  static from<V, E>(list: V[]): RXObservable<V, E> {
    return new RXFrom<V, E>(list).asObservable
  }

  static queue<V, E>(): RXQueue<V, E> {
    return new RXQueue<V, E>()
  }

  static waitUntilComplete<V, E>(list: AnyRXObservable[] | AnyRXObservable, result?: RXObservable<V, E>): RXObservable<V, E> {
    return new RXWaitUntilComplete<V, E>(list, result).asObservable
  }

  static justComplete<V, E>(value?: V): RXObservable<V, E> {
    return new RXJustComplete<V, E>(value).asObservable
  }

  static justError<V, E>(error: E): RXObservable<V, E> {
    return new RXJustError<V, E>(error).asObservable
  }

  static delayedComplete<V, E>(ms: number, value?: V): RXObservable<V, E> {
    return new RXDelayedComplete<V, E>(ms, value).asObservable
  }

  static delayedError<V, E>(ms: number, error: E): RXObservable<V, E> {
    return new RXDelayedError<V, E>(ms, error).asObservable
  }
}
