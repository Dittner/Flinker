import {describe, expect, test} from '@jest/globals'
import {RXEmitter, RXOperation, RXSubject} from '../../src/rx/RXPublisher'
import {asyncDelay} from '../../src/rx/Utils'

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

  test('2. fork and RXEmitter', async() => {
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

  test('3. fork and RXEmitter without sending value', async() => {
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

  test('4. fork and RXOperation', async() => {
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
})
