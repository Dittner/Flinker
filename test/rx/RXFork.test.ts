import { describe, expect, test } from '@jest/globals'
import { RXEmitter, RXObservableEntity, RXObservableValue, RXOperation, RXSubject } from '../../src/rx/RXPublisher'
import { asyncDelay } from '../../src/rx/Utils'

describe('RX FORK', () => {
  test('1. fork and RXSubject', () => {
    const op = new RXSubject<number, void>(1)
    let buffer1 = ''
    let buffer2 = ''
    let buffer3 = ''
    let buffer4 = ''

    op.pipe()
      .onReceive(v => (buffer1 += v))
      .onError(() => (buffer1 += 'e'))
      .onComplete(() => (buffer1 += 'c'))
      .subscribe()

    const ob = op.pipe()
      .map(v => v + '')
      .fork()

    ob.pipe()
      .onReceive(v => (buffer2 += v))
      .onError(() => (buffer2 += 'e'))
      .onComplete(() => (buffer2 += 'c'))
      .subscribe()

    ob.pipe()
      .onReceive(v => (buffer3 += v))
      .onError(() => (buffer3 += 'e'))
      .onComplete(() => (buffer3 += 'c'))
      .subscribe()

    op.send(2)
    op.sendComplete()

    ob.pipe()
      .onReceive(v => (buffer4 += v))
      .onError(() => (buffer4 += 'e'))
      .onComplete(() => (buffer4 += 'c'))
      .subscribe()

    expect(buffer1).toBe('12c')
    expect(buffer2).toBe('12c')
    expect(buffer3).toBe('12c')
    expect(buffer4).toBe('2c')
  })

  test('2. fork and RXEmitter', async () => {
    const op = new RXEmitter<number, void>()
    let buffer1 = ''
    let buffer2 = ''
    let buffer3 = ''
    let buffer4 = ''

    op.pipe()
      .onReceive(v => (buffer1 += v))
      .onError(() => (buffer1 += 'e'))
      .onComplete(() => (buffer1 += 'c'))
      .subscribe()

    const ob = op.pipe()
      .map(v => v + '')
      .fork()

    ob.pipe()
      .onReceive(v => (buffer2 += v))
      .onError(() => (buffer2 += 'e'))
      .onComplete(() => (buffer2 += 'c'))
      .subscribe()

    ob.pipe()
      .onReceive(v => (buffer3 += v))
      .onError(() => (buffer3 += 'e'))
      .onComplete(() => (buffer3 += 'c'))
      .subscribe()

    op.send(2)
    op.sendComplete()

    ob.pipe()
      .onReceive(v => (buffer4 += v))
      .onError(() => (buffer4 += 'e'))
      .onComplete(() => (buffer4 += 'c'))
      .subscribe()

    expect(buffer1).toBe('2c')
    expect(buffer2).toBe('2c')
    expect(buffer3).toBe('2c')
    expect(buffer4).toBe('2c')
  })

  test('3. fork and RXEmitter without sending value', async () => {
    const op = new RXEmitter<number, void>()
    let buffer1 = ''
    let buffer2 = ''
    let buffer3 = ''
    let buffer4 = ''

    op.pipe()
      .onReceive(v => (buffer1 += v))
      .onError(() => (buffer1 += 'e'))
      .onComplete(() => (buffer1 += 'c'))
      .subscribe()

    const ob = op.pipe()
      .map(v => v + '')
      .fork()

    ob.pipe()
      .onReceive(v => (buffer2 += v))
      .onError(() => (buffer2 += 'e'))
      .onComplete(() => (buffer2 += 'c'))
      .subscribe()

    ob.pipe()
      .onReceive(v => (buffer3 += v))
      .onError(() => (buffer3 += 'e'))
      .onComplete(() => (buffer3 += 'c'))
      .subscribe()

    op.sendComplete()

    ob.pipe()
      .onReceive(v => (buffer4 += v))
      .onError(() => (buffer4 += 'e'))
      .onComplete(() => (buffer4 += 'c'))
      .subscribe()

    expect(buffer1).toBe('c')
    expect(buffer2).toBe('c')
    expect(buffer3).toBe('c')
    expect(buffer4).toBe('c')
  })

  test('4. fork and RXOperation', async () => {
    const op = new RXOperation<number, void>()
    let buffer1 = ''
    let buffer2 = ''
    let buffer3 = ''
    let buffer4 = ''

    op.pipe()
      .onReceive(v => (buffer1 += v))
      .onError(() => (buffer1 += 'e'))
      .onComplete(() => (buffer1 += 'c'))
      .subscribe()

    const ob = op.pipe()
      .map(v => v + '')
      .fork()

    ob.pipe()
      .onReceive(v => (buffer2 += v))
      .onError(() => (buffer2 += 'e'))
      .onComplete(() => (buffer2 += 'c'))
      .subscribe()

    ob.pipe()
      .onReceive(v => (buffer3 += v))
      .onError(() => (buffer3 += 'e'))
      .onComplete(() => (buffer3 += 'c'))
      .subscribe()

    await asyncDelay(10)

    op.success(2)

    await asyncDelay(10)

    ob.pipe()
      .onReceive(v => (buffer4 += v))
      .onError(() => (buffer4 += 'e'))
      .onComplete(() => (buffer4 += 'c'))
      .subscribe()

    expect(buffer1).toBe('2c')
    expect(buffer2).toBe('2c')
    expect(buffer3).toBe('2c')
    expect(buffer4).toBe('2c')
  })

  test('5. fork and RXObservableEntity', async () => {
    class Doc extends RXObservableEntity<Doc> {
      private _header: string = ''
      get header(): string { return this._header }
      set header(value: string) {
        if (this._header !== value) {
          this._header = value
          this.mutated()
        }
      }

      private _body: string = ''
      get body(): string { return this._body }
      set body(value: string) {
        if (this._body !== value) {
          this._body = value
          this.mutated()
        }
      }
    }

    const doc = new Doc()
    let buffer1 = ''
    doc.pipe()
      .map(t => t.header)
      .onReceive(v => buffer1 += v)
      .subscribe()

    let buffer2 = ''
    const docHeader = doc.pipe()
      .map(t => t.header)
      .removeDuplicates()
      .fork() // creates a new RXPublisher

      docHeader.pipe()
      .onReceive(v => buffer2 += v)
      .subscribe()

    expect(buffer1).toBe('')
    expect(buffer2).toBe('')

    doc.header = 'h1'
    doc.header = 'h1' // no effect
    doc.header = 'h2'
    doc.body = 'body' // doc is changed, but docHeader – not

    expect(buffer1).toBe('h1h2h2')
    expect(buffer2).toBe('h1h2')
  })
})
