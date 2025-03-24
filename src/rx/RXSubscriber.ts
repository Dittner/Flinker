import type {RXSender} from './RX.ts'
import {type RXAnyPipeline} from './RXPipeline.js'

//--------------------------------------
//  Subscribe Methods
//--------------------------------------

export interface ErrorMethod<E> {
  onError(callback: (e: E) => void): CompleteMethod & SubscribeMethod
}

export interface CompleteMethod {
  onComplete(callback: () => void): SubscribeMethod
}

export interface SubscribeMethod {
  subscribe(): () => void
}

//--------------------------------------
//  RXSubscriber
//--------------------------------------

export type RXAnySubscriber = RXSubscriber<any, any>

export class RXSubscriber<V, E> implements RXSender<V, E> {
  private onReceiveCallback?: (value: V) => void
  private onErrorCallback?: (e: E) => void
  private onCompleteCallback?: () => void

  readonly pipeline: RXAnyPipeline
  constructor(pipeline: RXAnyPipeline) {
    this.pipeline = pipeline
  }

  private _isComplete = false
  get isComplete(): boolean { return this._isComplete }

  send(value: V, broadcast: boolean) {
    if (!this._isComplete) {
      this.onReceiveCallback?.(value)
    }
  }

  sendError(e: E, broadcast: boolean) {
    if (!this._isComplete) {
      this.onErrorCallback?.(e)
    }
  }

  sendComplete(broadcast: boolean) {
    if (!this._isComplete) {
      this._isComplete = true
      this.onCompleteCallback?.()
      this.unsubscribe()
    }
  }

  onReceive(f: (v: any) => void): ErrorMethod<E> & CompleteMethod & SubscribeMethod {
    if (this.isComplete) throw new Error('RXSubscriber is complete: It can update onReceiveCallback')
    else if (this.isSubscribed) throw new Error('RXSubscriber can not update onReceiveCallback: subscribe() is already evoked')

    this.onReceiveCallback = f
    return this as ErrorMethod<E> & CompleteMethod & SubscribeMethod
  }

  onError(f: (e: E) => void): CompleteMethod & SubscribeMethod {
    if (this.isComplete) throw new Error('RXSubscriber is complete: It can not update onErrorCallback')
    else if (this.isSubscribed) throw new Error('RXSubscriber can not update onErrorCallback: subscribe() is already evoked')

    this.onErrorCallback = f
    return this as CompleteMethod & SubscribeMethod
  }

  onComplete(f: () => void): SubscribeMethod {
    if (this.isComplete) throw new Error('RXSubscriber is complete: It can not update onCompleteCallback')
    else if (this.isSubscribed) throw new Error('RXSubscriber can not update onCompleteCallback: subscribe() is already evoked')

    this.onCompleteCallback = f
    return this as SubscribeMethod
  }

  private isSubscribed = false

  subscribe(): () => void {
    if (this.isSubscribed) throw new Error('RXPipeline has already a subscriber')
    this.isSubscribed = true
    this.pipeline.dispatcher.didSubscribe(this.pipeline)
    return () => {
      this.unsubscribe()
    }
  }

  unsubscribe() {
    this.onReceiveCallback = undefined
    this.onErrorCallback = undefined
    this.onCompleteCallback = undefined
    this.pipeline.dispatcher.didUnsubscribe(this.pipeline)
  }
}
