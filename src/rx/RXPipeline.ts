import {type RXPublisher} from './RXPublisher.js'
import {RXOperator, type RXOperatorProtocol} from './RXOperator.js'
import {type RXObject, type RXObjectType, type RXSender} from './RX.js'

//--------------------------------------
//  RXPipeline
//--------------------------------------
export type RXAnyPipeline = RXPipeline<any, any>

export class RXPipeline<V, E> implements RXSender<V, E>, RXObject {
  readonly type: RXObjectType = 'pipeline'
  readonly dispatcher: RXPublisher<V, E>
  readonly child: RXOperator<V, E>
  get asOperator(): RXOperatorProtocol<V, E> { return this.child }

  constructor(dispatcher: RXPublisher<V, E>) {
    this.child = new RXOperator<V, E>(this)
    this.dispatcher = dispatcher
  }

  send(value: any, broadcast: boolean) {
    this.child.send(value, broadcast)
  }

  sendError(e: E, broadcast: boolean) {
    this.child.sendError(e, broadcast)
  }

  sendComplete(broadcast: boolean) {
    this.child.sendComplete(broadcast)
  }
}
