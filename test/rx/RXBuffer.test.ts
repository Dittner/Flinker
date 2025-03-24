import {describe, expect, test} from '@jest/globals'
import {RXBuffer} from '../../src/rx/RXPublisher.js'

describe('RXBuffer Module', () => {
  test('0. buffer', async() => {
    const b = new RXBuffer<number, string>()
    let res1 = ''
    let res2 = ''
    let res3 = ''
    b.pipe()
      .map(v => v + '')
      .onReceive((v) => (res1 += v))
      .onError(() => (res1 += 'e'))
      .onComplete(() => (res1 += 'c'))
      .subscribe()

    expect(res1).toBe('')

    b.send(1)
    b.send(2)

    b.pipe()
      .onReceive((v) => (res2 += v + ''))
      .onError(() => (res2 += 'e'))
      .onComplete(() => (res2 += 'c'))
      .subscribe()

    expect(res1).toBe('12')
    expect(res2).toBe('12')

    b.send(3)
    console.log('...sending 3')

    expect(res1).toBe('123')
    expect(res2).toBe('123')

    console.log('...sendingComplete')
    b.sendComplete()

    expect(res1).toBe('123c')
    expect(res2).toBe('123c')

    b.pipe()
      .onReceive((v) => (res3 += v))
      .onError(() => (res3 += 'e'))
      .onComplete(() => (res3 += 'c'))
      .subscribe()

    expect(res3).toBe('123c')

    b.send(4)

    expect(res1).toBe('123c')
    expect(res2).toBe('123c')
    expect(res3).toBe('123c')
  })

  test('1. errors do not block sending value', () => {
    const b = new RXBuffer()
    let res1 = ''
    let res2 = ''
    let res3 = ''
    b.pipe()
      .map(v => v + '')
      .onReceive((v) => (res1 += v))
      .onError(() => (res1 += 'e'))
      .onComplete(() => (res1 += 'c'))
      .subscribe()

    expect(res1).toBe('')

    b.send(1)
    b.send(2)
    b.sendError('e')
    b.send(3)

    expect(res1).toBe('12e3')

    b.pipe()
      .map(v => v + '')
      .onReceive((v) => (res2 += v))
      .onError(() => (res2 += 'e'))
      .onComplete(() => (res2 += 'c'))
      .subscribe()

    expect(res2).toBe('12e3')

    b.send(4)
    b.sendError('e')
    b.send(5)

    expect(res1).toBe('12e34e5')
    expect(res2).toBe('12e34e5')

    b.sendComplete()
    b.send(6)
    b.sendError('e')
    b.send(7)

    b.pipe()
      .map(v => v + '')
      .onReceive((v) => (res3 += v))
      .onError(() => (res3 += 'e'))
      .onComplete(() => (res3 += 'c'))
      .subscribe()

    expect(res1).toBe('12e34e5c')
    expect(res2).toBe('12e34e5c')
    expect(res3).toBe('12e34e5c')
  })

  test('2. unsubscribe', () => {
    const b = new RXBuffer()
    let res1 = ''
    let res2 = ''
    const unsubscribe1 = b.pipe()
      .onReceive((v) => (res1 += v))
      .onError(() => (res1 += 'e'))
      .onComplete(() => (res1 += 'c'))
      .subscribe()

    b.send(1)
    b.send(2)

    expect(res1).toBe('12')

    const unsubscribe2 = b.pipe()
      .onReceive((v) => (res2 += v))
      .onError(() => (res2 += 'e'))
      .onComplete(() => (res2 += 'c'))
      .subscribe()

    expect(res2).toBe('12')

    unsubscribe1()
    b.send(3)

    expect(res1).toBe('12')
    expect(res2).toBe('123')

    b.sendComplete()
    b.send(4)
    unsubscribe1()
    unsubscribe2()

    expect(res1).toBe('12')
    expect(res2).toBe('123c')
  })
})
