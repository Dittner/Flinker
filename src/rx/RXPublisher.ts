import {type RXAnyOperatorProtocol, type RXOperatorProtocol} from './RXOperator'
import {type RXAnyPipeline, RXPipeline} from './RXPipeline'
import {type RXObject, type RXObjectType} from './RX'

export type SessionUID = number
const generateSUID = (() => {
  let value = 0
  return (): SessionUID => {
    return value++
  }
})()

//--------------------------------------
//  RXObservable
//--------------------------------------
export type AnyRXObservable = RXObservable<any, any>
export interface RXObservable<V, E> extends RXObject {
  suid: SessionUID
  isComplete: boolean
  pipe(): RXOperatorProtocol<V, E>
}

//--------------------------------------
//  RXPublisher
//--------------------------------------
export type RXAnyPublisher = RXPublisher<any, any>

export class RXPublisher<V, E> implements RXObservable<V, E> {
  readonly suid = generateSUID()
  readonly type: RXObjectType = 'observable'

  protected readonly pipelines: RXAnyPipeline[]

  constructor() {
    this.pipelines = Array<RXAnyPipeline>()
  }

  get volume() { return this.pipelines.length }
  get asObservable(): RXObservable<V, E> { return this }

  protected _isComplete = false
  get isComplete(): boolean { return this._isComplete }

  pipe(): RXOperatorProtocol<V, E> {
    const pipe = new RXPipeline<V, E>(this)
    this.pipelines.push(pipe)
    return pipe.asOperator
  }

  didSubscribe(p: RXAnyPipeline) {
    this.isComplete && p.sendComplete(false)
  }

  private readonly pendingUnsubscribePipes = Array<RXAnyPipeline>()
  didUnsubscribe(p: RXAnyPipeline) {
    if (this.isSending) {
      this.pendingUnsubscribePipes.push(p)
      return
    }
    const index = this.pipelines.indexOf(p)
    index !== -1 && this.pipelines.splice(index, 1)
  }

  //--------------------------------------
  //  Sending methods
  //--------------------------------------

  private isSending = false
  protected send(value: V) {
    this.isSending = true
    this.pipelines.forEach(i => { i.send(value, true) })
    this.isSending = false
    this.runPendingOperations()
  }

  protected sendError(e: E) {
    this.isSending = true
    this.pipelines.forEach(i => { i.sendError(e, true) })
    this.isSending = false
    this.runPendingOperations()
  }

  protected sendComplete() {
    this.isSending = true
    this._isComplete = true
    this.pipelines.forEach(i => { i.sendComplete(true) })
    this.pipelines.length = 0
    this.isSending = false
    this.runPendingOperations()
  }

  private runPendingOperations() {
    if (this.isSending) return
    if (this.pendingUnsubscribePipes.length > 0) {
      this.pendingUnsubscribePipes.forEach(p => { this.didUnsubscribe(p) })
      this.pendingUnsubscribePipes.length = 0
    }
  }
}

//--------------------------------------
//  RXJustComplete
//--------------------------------------
export class RXJustComplete<V, E> extends RXPublisher<V, E> {
  readonly value?: V

  constructor(value?: V) {
    super()
    this.value = value
    value !== undefined && this.send(value)
    this.sendComplete()
  }

  didSubscribe(p: RXAnyPipeline) {
    this.isComplete && this.value !== undefined && p.send(this.value, false)
    this.isComplete && p.sendComplete(false)
  }
}

//--------------------------------------
//  RXJustError
//--------------------------------------
export class RXJustError<V, E> extends RXPublisher<V, E> {
  readonly error: E

  constructor(error: E) {
    super()
    this.error = error
    this.sendError(error)
    this.sendComplete()
  }

  didSubscribe(p: RXAnyPipeline) {
    this.isComplete && p.sendError(this.error, false)
    this.isComplete && p.sendComplete(false)
  }
}

//--------------------------------------
//  RXDelayedComplete
//--------------------------------------
export class RXDelayedComplete<V, E> extends RXPublisher<V, E> {
  readonly value?: V
  constructor(ms: number, value?: V) {
    super()
    this.value = value
    setTimeout(() => {
      value !== undefined && this.send(value)
      this.sendComplete()
    }, ms)
  }

  didSubscribe(p: RXAnyPipeline) {
    this.isComplete && this.value !== undefined && p.send(this.value, false)
    this.isComplete && p.sendComplete(false)
  }
}
//--------------------------------------
//  RXDelayedError
//--------------------------------------
export class RXDelayedError<V, E> extends RXPublisher<V, E> {
  readonly error: E
  constructor(ms: number, error: E) {
    super()
    this.error = error
    setTimeout(() => {
      this.sendError(error)
      this.sendComplete()
    }, ms)
  }

  didSubscribe(p: RXAnyPipeline) {
    this.isComplete && p.sendError(this.error, false)
    this.isComplete && p.sendComplete(false)
  }
}

//--------------------------------------
//  RXEmitter
//--------------------------------------

export class RXEmitter<V, E> extends RXPublisher<V, E> {
  private _hasValue = false
  private _value: V | undefined
  get value(): V | undefined { return this._value }

  private hasError = false
  private _err: E | undefined = undefined
  get err(): E | undefined { return this._err }

  constructor() {
    super()
  }

  override send(value: V) {
    if (this.isComplete) return
    this._value = value
    this._hasValue = true
    super.send(value)
  }

  override sendError(e: E) {
    if (this.isComplete) return
    this._err = e
    this.hasError = true
    super.sendError(e)
  }

  override sendComplete() {
    if (this.isComplete) return
    super.sendComplete()
  }

  didSubscribe(p: RXAnyPipeline) {
    this.hasError && p.sendError(this.err!, false)
    !this.hasError && this._hasValue && p.send(this.value, false)
    this.isComplete && p.sendComplete(false)
  }
}

//--------------------------------------
//  RXSubject
//--------------------------------------

export class RXSubject<V, E> extends RXPublisher<V, E> {
  private _value: V
  get value(): V { return this._value }

  private _hasError = false
  private _err: E | undefined = undefined
  get err(): E | undefined {
    return this._err
  }

  constructor(value: V) {
    super()
    this._value = value
  }

  override send(value: V) {
    if (this.isComplete) return
    this._value = value
    super.send(value)
  }

  resend() {
    super.send(this.value)
  }

  override sendError(e: E) {
    if (this.isComplete) return
    this._err = e
    this._hasError = true
    super.sendError(e)
  }

  override sendComplete() {
    if (this.isComplete) return
    this._isComplete = true
    super.sendComplete()
  }

  didSubscribe(p: RXAnyPipeline) {
    this._hasError && p.sendError(this.err!, false)
    !this._hasError && p.send(this.value, false)
    this.isComplete && p.sendComplete(false)
  }
}

//--------------------------------------
//  RXBuffer
//--------------------------------------

export class RXBuffer<V, E> extends RXPublisher<V, E> {
  private readonly values = Array<V>()
  private readonly errors = Array<E>()
  private readonly isError = Array<boolean>()

  override send(value: V) {
    if (this.isComplete) return
    this.values.push(value)
    this.isError.push(false)
    super.send(value)
  }

  override sendError(e: E) {
    if (this.isComplete) return
    this.errors.push(e)
    this.isError.push(true)
    super.sendError(e)
  }

  override sendComplete() {
    if (this.isComplete) return
    this._isComplete = true
    super.sendComplete()
  }

  didSubscribe(p: RXAnyPipeline) {
    for (let i = 0, v = 0, e = 0; i < this.isError.length; i++) {
      if (this.isError[i]) {
        e < this.errors.length && p.sendError(this.errors[e], false)
        e++
      } else {
        v < this.values.length && p.send(this.values[v], false)
        v++
      }
    }
    this.isComplete && p.sendComplete(false)
  }
}

//--------------------------------------
//  RXOperation
//--------------------------------------

export class RXOperation<V, E> extends RXPublisher<V, E> {
  private _value: V | undefined = undefined
  get value(): V | undefined { return this._value }

  private _hasError = false
  private _err: E | undefined = undefined
  get err(): E | undefined { return this._err }

  success(value: V) {
    if (this.isComplete) return
    this._value = value
    super.send(value)
    super.sendComplete()
  }

  fail(e: E) {
    if (this.isComplete) return
    this._err = e
    this._hasError = true
    super.sendError(e)
    super.sendComplete()
  }

  didSubscribe(p: RXAnyPipeline) {
    if (!this.isComplete) return
    if (this._hasError) {
      p.sendError(this.err!, false)
      p.sendComplete(false)
    } else {
      p.send(this.value, false)
      p.sendComplete(false)
    }
  }
}

//--------------------------------------
//  RXCombine
//--------------------------------------
export class RXCombine extends RXPublisher<any[], any> {
  private readonly _values: any[] = []
  get values(): any[] { return this._values }

  private _hasError = false
  private _err: any | undefined = undefined
  get err(): any | undefined { return this._err }

  constructor(list: Array<AnyRXObservable | RXAnyOperatorProtocol>) {
    super()
    let count = list.length
    this._values = new Array(list.length).fill(undefined)

    list.forEach((rx, ind) => {
      const op = rx instanceof RXPublisher ? rx.asObservable.pipe() : rx as RXAnyOperatorProtocol
      op.onReceive(v => {
        this.values[ind] = v
        super.send(this.values)
      })
        .onError((e: any) => {
          this._err = e
          this._hasError = true
          super.sendError(e)
        })
        .onComplete(() => {
          count--
          if (count === 0) {
            this._isComplete = true
            super.sendComplete()
          }
        })
        .subscribe()
    })
    if (count === 0) {
      super.sendComplete()
    }
  }

  didSubscribe(p: RXAnyPipeline) {
    !this._hasError && p.send(this.values, false)
    this._hasError && p.sendError(this.err, false)
    this.isComplete && p.sendComplete(false)
  }
}

//--------------------------------------
//  RXFrom
//--------------------------------------
export class RXFrom<V, E> extends RXPublisher<V, E> {
  readonly values: V[]
  constructor(list: V[]) {
    super()
    this.values = list
    this.sendComplete()
  }

  didSubscribe(p: RXAnyPipeline) {
    this.values.forEach(v => { p.send(v, false) })
    p.sendComplete(false)
  }
}

//--------------------------------------
//  RXWaitUntilComplete
//--------------------------------------
/*
  * wait until all publishers are complete and then send a value of the last publisher if it's specified
  * */
export class RXWaitUntilComplete<V, E> extends RXPublisher<V, E> {
  private _value: V | undefined = undefined
  get value(): V | undefined { return this._value }

  private readonly _resultPublisher: RXObservable<V, E> | undefined
  private _hasError = false
  private _err: any | undefined = undefined
  get err(): any | undefined { return this._err }

  constructor(list: AnyRXObservable[] | AnyRXObservable, resultPublisher?: RXObservable<V, E>) {
    super()
    this._resultPublisher = resultPublisher
    let count = Array.isArray(list) ? list.length : 1

    if (Array.isArray(list)) {
      list.forEach(ob =>
        ob.pipe()
          .onError(e => {
            this._err = e
            this._hasError = true
            super.sendError(e)
          })
          .onComplete(() => {
            count--
            if (count === 0) this.subscribeToResultPublisher()
          })
          .subscribe()
      )
      if (count === 0) this.subscribeToResultPublisher()
    } else {
      list.pipe()
        .onError(e => {
          this._err = e
          this._hasError = true
          super.sendError(e)
        })
        .onComplete(() => {
          this.subscribeToResultPublisher()
        })
        .subscribe()
    }
  }

  private subscribeToResultPublisher() {
    if (this._resultPublisher) {
      this._resultPublisher.pipe()
        .onReceive(v => {
          this._value = v
          super.send(v)
        })
        .onError((e: any) => {
          this._err = e
          this._hasError = true
          super.sendError(e)
        })
        .onComplete(() => {
          this._isComplete = true
          super.sendComplete()
        })
        .subscribe()
    } else {
      this._isComplete = true
      super.sendComplete()
    }
  }

  didSubscribe(p: RXAnyPipeline) {
    !this._hasError && this.isComplete && this._resultPublisher?.isComplete && p.send(this.value, false)
    this._hasError && p.sendError(this.err, false)
    this.isComplete && p.sendComplete(false)
  }
}

/*
*
* UI
*
* */

//--------------------------------------
//  RXObservableEntity
//--------------------------------------
export class RXObservableEntity<V> extends RXPublisher<V, any> {
  protected mutated() {
    this.send(this)
  }

  protected override send(value: any) {
    super.send(value)
  }

  protected dispose() {
    this.sendComplete()
  }

  didSubscribe(p: RXAnyPipeline) {
    p.send(this, false)
    this.isComplete && p.sendComplete(false)
  }
}

//--------------------------------------
//  RXMutableValue
//--------------------------------------
export class RXObservableValue<V> extends RXPublisher<V, any> {
  private _value: V
  get value(): V { return this._value }
  set value(value: V) {
    if (value !== this._value) {
      this._value = value
      super.send(value)
    }
  }

  constructor(value: V) {
    super()
    this._value = value
  }

  didSubscribe(p: RXAnyPipeline) {
    p.send(this.value, false)
    this.isComplete && p.sendComplete(false)
  }
}

//--------------------------------------
//  RXQueue
//--------------------------------------

export type RXAnyQueueOperator = RXQueueOperator<any, any>
export class RXQueueOperator<V, E> {
  protected readonly op: RXOperation<any, E>
  protected child?: RXQueueOperator<V, E>
  protected inProgress = true
  protected value: V | undefined = undefined

  constructor(op: RXOperation<any, E>) {
    this.op = op
  }

  //--------------------------------------
  //  RXSender Protocol
  //--------------------------------------

  protected send(value: any) {
    if (!this.op.isComplete) {
      this.child?.send(value)
    }
  }

  //--------------------------------------
  //  OPERATORS
  //--------------------------------------

  next<T>(f: (v: V) => RXObservable<T, E>): RXQueueOperator<T, E> {
    const operator = this.addChild(new RXQueueNext<T, E>(this.op, f))
    if (!this.inProgress) {
      operator.send(this.value)
    }
    return operator
  }

  private addChild<T extends RXAnyQueueOperator>(op: T): T {
    this.child = op
    return op
  }

  complete(): RXObservable<V, E> {
    if (!this.op.isComplete) {
      this.next(res => {
        this.op.success(res)
        return this.op
      })
    }
    return this.op.asObservable
  }
}

class RXQueueNext<V, E> extends RXQueueOperator<V, E> {
  private readonly mapper: (value: any) => RXObservable<V, E>
  constructor(op: RXOperation<any, E>, mapper: (value: any) => RXObservable<V, E>) {
    super(op)
    this.mapper = mapper
  }

  override send(value: any | undefined) {
    if (this.op.isComplete) return
    const rx = this.mapper(value)
    rx.pipe()
      .onReceive((v) => {
        this.value = v
      })
      .onError((e: any) => {
        this.op.fail(e)
      })
      .onComplete(() => {
        this.inProgress = false
        super.send(this.value)
      })
      .subscribe()
  }
}

export class RXQueue<V, E> extends RXQueueOperator<void, E> {
  constructor() {
    super(new RXOperation<V, E>())
    this.inProgress = false
  }

  //--------------------------------------
  //  asObservable
  //--------------------------------------
  get asObservable(): RXObservable<V, E> { return this.op.asObservable }

  //--------------------------------------
  //  isComplete
  //--------------------------------------
  get isComplete(): boolean { return this.op.isComplete }

  override next<T>(f: () => RXObservable<T, E>): RXQueueOperator<T, E> {
    return super.next(f)
  }

  success(v: V) {
    this.op.success(v)
  }

  fail(e: E) {
    this.op.fail(e)
  }
}
