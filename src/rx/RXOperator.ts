import {RXEmitter, RXJustComplete, type RXObservable} from './RXPublisher.js'
import {type RXAnyPipeline, type RXPipeline} from './RXPipeline'
import {type CompleteMethod, type ErrorMethod, RXSubscriber, type SubscribeMethod} from './RXSubscriber.js'
import {type RXAnySender, type RXObject, type RXObjectType, type RXSender} from './RX.js'

//--------------------------------------
//  RXOperatorProtocol
//--------------------------------------
export interface RXOperatorProtocol<V, E> extends RXObject {
  skipFirst(): RXOperatorProtocol<V, E>
  skipNullable(): RXOperatorProtocol<NonNullable<V>, E>
  removeDuplicates(defValue?: V): RXOperatorProtocol<V, E>
  debounce(ms: number): RXOperatorProtocol<V, E>
  map<T>(f: (v: V) => T): RXOperatorProtocol<T, E>
  flatMap<T>(f: (v: V) => RXObservable<T, E>): RXOperatorProtocol<T, E>
  sequent<T>(f: (v: V) => RXObservable<T, E>): RXOperatorProtocol<T, E>
  parallel<T>(f: (v: V) => RXObservable<T, E>): RXOperatorProtocol<T, E>
  filter(predicate: (v: V) => boolean): RXOperatorProtocol<V, E>
  spread(): RXOperatorProtocol<ArrayElementTypeOf<V>, E>
  replaceError(replaceWith: (e: E) => V | null): RXOperatorProtocol<V, E>
  fork(): RXObservable<V, E>
  onReceive(f: (v: V) => void): ErrorMethod<E> & CompleteMethod & SubscribeMethod
  onError(f: (e: E) => void): CompleteMethod & SubscribeMethod
  onComplete(f: () => void): SubscribeMethod
}

//--------------------------------------
//  RXOperator
//--------------------------------------
type ArrayElementTypeOf<T> = T extends Array<infer U> ? U : T
export type RXAnyOperator = RXOperator<any, any>
export type RXAnyOperatorProtocol = RXOperatorProtocol<any, any>

export class RXOperator<V, E> implements RXOperatorProtocol<V, E>, RXSender<V, E> {
  protected pipeline: RXAnyPipeline
  protected child?: RXAnySender
  readonly type: RXObjectType = 'operator'

  constructor(pipeline: RXPipeline<V, E>) {
    this.pipeline = pipeline
  }

  //--------------------------------------
  //  isComplete
  //--------------------------------------
  protected _isComplete = false
  get isComplete(): boolean { return this._isComplete }

  //--------------------------------------
  //  RXSender Protocol
  //--------------------------------------

  send(value: any, broadcast: boolean) {
    if (!this.isComplete) {
      this.child?.send(value, broadcast)
    }
  }

  sendError(e: E, broadcast: boolean) {
    if (!this.isComplete) {
      this.child?.sendError(e, broadcast)
    }
  }

  sendComplete(broadcast: boolean) {
    if (!this.isComplete) {
      this._isComplete = true
      this.child?.sendComplete(broadcast)
    }
  }

  //--------------------------------------
  //  OPERATORS
  //--------------------------------------

  skipFirst(): RXOperator<V, E> {
    return this.addChild(new RXSkipFirst<V, E>(this.pipeline))
  }

  skipNullable(): RXOperator<NonNullable<V>, E> {
    return this.addChild(new RXSkipNullable<NonNullable<V>, E>(this.pipeline))
  }

  removeDuplicates(value?: V): RXOperator<V, E> {
    return this.addChild(new RXRemoveDuplicates<V, E>(this.pipeline, value))
  }

  debounce(ms: number): RXOperator<V, E> {
    return this.addChild(new RXDebounce<V, E>(this.pipeline, ms))
  }

  map<T>(f: (v: V) => T): RXOperator<T, E> {
    return this.addChild(new RXMap<T, E>(this.pipeline, f))
  }

  flatMap<T>(f: (v: V) => RXObservable<T, E>): RXOperator<T, E> {
    return this.addChild(new RXFlatMap<T, E>(this.pipeline, f))
  }

  sequent<T>(f: (v: V) => RXObservable<T, E>): RXOperator<T, E> {
    return this.addChild(new RXSequent<T, E>(this.pipeline, f))
  }

  parallel<T>(f: (v: V) => RXObservable<T, E>): RXOperator<T, E> {
    return this.addChild(new RXParallel<T, E>(this.pipeline, f))
  }

  filter(predicate: (v: V) => boolean): RXOperator<V, E> {
    return this.addChild(new RXFilter<V, E>(this.pipeline, predicate))
  }

  spread(): RXOperator<ArrayElementTypeOf<V>, E> {
    return this.addChild(new RXSpread<ArrayElementTypeOf<V>, E>(this.pipeline))
  }

  replaceError(replaceWith: (e: E) => V | null): RXOperator<V, E> {
    return this.addChild(new RXReplaceError<V, E>(this.pipeline, replaceWith))
  }

  private addChild<T extends RXAnyOperator>(op: T): T {
    this.child = op
    return op
  }

  //--------------------------------------
  //  Output
  //--------------------------------------

  fork(): RXObservable<V, E> {
    const subscriber = new RXSubscriber<V, E>(this.pipeline)
    this.child = subscriber
    const dispatcher = new RXEmitter<V, E>()
    subscriber.onReceive((v) => { dispatcher.send(v) })
    subscriber.onError((e) => { dispatcher.sendError(e) })
    subscriber.onComplete(() => { dispatcher.sendComplete() })
    subscriber.subscribe()
    return dispatcher.asObservable
  }

  onReceive(f: (v: V) => void) {
    const subscriber = new RXSubscriber<V, E>(this.pipeline)
    this.child = subscriber
    return subscriber.onReceive(f)
  }

  onError(f: (e: E) => void) {
    const subscriber = new RXSubscriber<V, E>(this.pipeline)
    this.child = subscriber
    return subscriber.onError(f)
  }

  onComplete(f: () => void) {
    const subscriber = new RXSubscriber<V, E>(this.pipeline)
    this.child = subscriber
    return subscriber.onComplete(f)
  }
}

//--------------------------------------
//  RXMap
//--------------------------------------

export class RXMap<V, E> extends RXOperator<V, E> {
  protected mapper: (value: any) => V

  constructor(pipe: RXAnyPipeline, mapper: (value: any) => V) {
    super(pipe)
    this.mapper = mapper
  }

  override send(value: any, broadcast: boolean) {
    const newValue = this.mapper(value)
    super.send(newValue, broadcast)
  }
}

//--------------------------------------
//  RXFlatMap
//--------------------------------------

export class RXFlatMap<V, E> extends RXOperator<V, E> {
  protected mapper: (value: any) => RXObservable<V, E>
  constructor(pipe: RXAnyPipeline, mapper: (value: any) => RXObservable<V, E>) {
    super(pipe)
    this.mapper = mapper
  }

  override send(value: any, broadcast: boolean) {
    if (this.isComplete) return
    this.mapper(value).pipe()
      .onReceive(v => {
        super.send(v, broadcast)
      })
      .onError((e: any) => {
        this.sendError(e, broadcast)
      })
      .subscribe()
  }
}

//--------------------------------------
//  RXSequent
//--------------------------------------
interface RXSequentNotification {
  hasError: boolean
  value?: any
  error?: any
  broadcast: boolean
}

export class RXSequent<V, E> extends RXOperator<V, E> {
  protected mapper: (value: any) => RXObservable<V, E>
  private readonly buffer = Array<RXSequentNotification>()
  private willComplete = false
  private willCompleteBroadcast = false

  constructor(pipe: RXAnyPipeline, mapper: (value: any) => RXObservable<V, E>) {
    super(pipe)
    this.mapper = mapper
  }

  override send(value: any, broadcast: boolean) {
    this.buffer.push({hasError: false, value, broadcast})
    this.processNext()
  }

  override sendError(error: E, broadcast: boolean) {
    this.buffer.push({hasError: true, error, broadcast})
    this.processNext()
  }

  override sendComplete(broadcast: boolean) {
    this.willComplete = true
    this.willCompleteBroadcast ||= broadcast
    this.processNext()
  }

  private curOp: RXObservable<V, E> = new RXJustComplete()
  private processNext() {
    if (!this.curOp.isComplete) return

    const notification = this.buffer.shift()
    if (notification) {
      if (notification.hasError) {
        super.sendError(notification.error, notification.broadcast)
        this.processNext()
      } else if (notification.value !== undefined) {
        this.curOp = this.mapper(notification.value)
        this.curOp.pipe()
          .onReceive(v => {
            super.send(v, notification.broadcast)
          })
          .onError((e: any) => {
            super.sendError(e, notification.broadcast)
          })
          .onComplete(() => { this.processNext() })
          .subscribe()
      } else {
        this.processNext()
      }
    } else {
      if (this.willComplete) super.sendComplete(this.willCompleteBroadcast)
    }
  }
}

//--------------------------------------
//  RXParallel
//--------------------------------------

export class RXParallel<V, E> extends RXOperator<V, E> {
  protected mapper: (value: any) => RXObservable<V, E>
  private willComplete = false
  private willCompleteBroadcast = false
  private activeOperations = 0

  constructor(pipe: RXAnyPipeline, mapper: (value: any) => RXObservable<V, E>) {
    super(pipe)
    this.mapper = mapper
  }

  override send(value: any, broadcast: boolean) {
    this.activeOperations++
    this.mapper(value).pipe()
      .onReceive(v => {
        super.send(v, broadcast)
      })
      .onError((e: any) => {
        super.sendError(e, broadcast)
      })
      .onComplete(() => {
        this.activeOperations--
        if (this.activeOperations === 0 && this.willComplete) super.sendComplete(this.willCompleteBroadcast)
      })
      .subscribe()
  }

  override sendComplete(broadcast: boolean) {
    this.willComplete = true
    this.willCompleteBroadcast ||= broadcast
    if (this.activeOperations === 0) {
      super.sendComplete(broadcast)
    }
  }
}

//--------------------------------------
//  RXFilter
//--------------------------------------

export class RXFilter<V, E> extends RXOperator<V, E> {
  protected predicate: (value: V) => boolean

  constructor(pipe: RXAnyPipeline, predicate: (value: V) => boolean) {
    super(pipe)
    this.predicate = predicate
  }

  override send(value: any, broadcast: boolean) {
    if (this.predicate(value)) super.send(value, broadcast)
  }
}

//--------------------------------------
//  RXSpread
//--------------------------------------

export class RXSpread<V, E> extends RXOperator<V, E> {
  override send(value: any, broadcast: boolean) {
    if (Array.isArray(value)) {
      value.forEach(v => {
        super.send(v, broadcast)
      })
    } else super.send(value, broadcast)
  }
}

//--------------------------------------
//  RXSkipFirst
//--------------------------------------

//ignore value emitted just after registration of a new subscriber
export class RXSkipFirst<V, E> extends RXOperator<V, E> {
  override send(value: any, broadcast: boolean) {
    if (broadcast) super.send(value, broadcast)
  }
}

//--------------------------------------
//  RXSkipNullable
//--------------------------------------

export class RXSkipNullable<V, E> extends RXOperator<V, E> {
  override send(value: any, broadcast: boolean) {
    if (value !== null && value !== undefined) super.send(value, broadcast)
  }
}

//--------------------------------------
//  RXRemoveDuplicates
//--------------------------------------

export class RXRemoveDuplicates<V, E> extends RXOperator<V, E> {
  private prevValue: V | undefined = undefined

  constructor(pipe: RXAnyPipeline, value?: V) {
    super(pipe)
    this.prevValue = value
  }

  override send(value: any, broadcast: boolean) {
    if (this.prevValue !== value) {
      this.prevValue = value
      super.send(value, broadcast)
    }
  }
}

//--------------------------------------
//  RXDebounce
//--------------------------------------

interface RXDebounceNotification {
  hasError: boolean
  value?: any
  error?: any
  broadcast: boolean
}

export class RXDebounce<V, E> extends RXOperator<V, E> {
  readonly ms: number

  constructor(pipe: RXAnyPipeline, ms: number) {
    super(pipe)
    this.ms = ms
  }

  private readonly buffer = Array<RXDebounceNotification>()
  private willComplete = false
  private willCompleteBroadcast = false

  private timeoutId: any | undefined = undefined

  private startTimer() {
    if (this.timeoutId) return
    this.timeoutId = setTimeout(() => {
      this.timeoutId = undefined

      for (let i = this.buffer.length - 1; i >= 0; i--) {
        const notification = this.buffer[i]
        if (notification.hasError) {
          super.sendError(notification.error, notification.broadcast)
        } else {
          super.send(notification.value, notification.broadcast)
        }

        //if (notification.broadcast) break
        break
      }
      this.buffer.length = 0
      if (this.willComplete) super.sendComplete(this.willCompleteBroadcast)
    }, this.ms)
  }

  override send(value: any, broadcast: boolean) {
    this.buffer.push({hasError: false, value, broadcast})
    this.startTimer()
  }

  override sendError(error: E, broadcast: boolean) {
    this.buffer.push({hasError: true, error, broadcast})
    this.startTimer()
  }

  override sendComplete(broadcast: boolean) {
    this.willComplete = true
    this.willCompleteBroadcast ||= broadcast
    this.startTimer()
  }
}

//--------------------------------------
//  RXReplaceError
//--------------------------------------

export class RXReplaceError<V, E> extends RXOperator<V, E> {
  readonly replaceWith: (e: E) => V | null

  constructor(pipe: RXAnyPipeline, replaceWith: (e: E) => V | null) {
    super(pipe)
    this.replaceWith = replaceWith
  }

  override sendError(e: E, broadcast: boolean) {
    const value = this.replaceWith(e)
    value ? this.send(value, broadcast) : super.sendError(e, broadcast)
  }
}
