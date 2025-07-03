import { describe, expect, test } from '@jest/globals'
import { RXEmitter, RXSubject } from '../../src/rx/RXPublisher'
import { asyncDelay } from '../../src/rx/Utils'

describe('RXSubject Module', () => {
  test('0. default state', () => {
    const sb = new RXSubject(1)
    let v1 = 0
    let v2 = 0
    let isComplete = false
    sb.pipe()
      .onReceive(value => (v1 = value))
      .onComplete(() => {
        isComplete = true
      })
      .subscribe()

    sb.sendComplete()

    sb.pipe()
      .onReceive(value => (v2 = value))
      .subscribe()

    expect(v1).toBe(1)
    expect(v2).toBe(1)
    expect(isComplete).toBe(true)
  })

  test('1. publishing', () => {
    const sb = new RXSubject(0)
    let v = -1
    sb.pipe()
      .onReceive(value => (v = value))
      .subscribe()
      
    expect(v).toBe(0)

    sb.send(1)
    expect(v).toBe(1)

    sb.sendComplete()
    expect(v).toBe(1)
    sb.send(2)
    expect(v).toBe(1)
  })

  test('2. unsubscribing', () => {
    const sb = new RXSubject(0)
    let v1 = 0
    let v2 = 0
    sb.pipe()
      .onReceive(value => (v1 = value)).subscribe()

    const unsubscribe = sb.pipe()
      .onReceive(value => (v2 = value))
      .subscribe()

    expect(v1).toBe(0)
    expect(v2).toBe(0)

    sb.send(1)
    expect(v1).toBe(1)
    expect(v2).toBe(1)

    unsubscribe()
    expect(v1).toBe(1)
    expect(v2).toBe(1)

    sb.send(2)
    expect(v1).toBe(2)
    expect(v2).toBe(1)
  })

  test('3. map', () => {
    const sb = new RXSubject(1)
    let v1 = 0
    let v2 = ''
    sb.pipe()
      .onReceive(value => (v1 = value)).subscribe()

    sb.pipe()
      .map(v => v + 10)
      .map(v => v + 'K')
      .onReceive(value => (v2 = value))
      .subscribe()
    expect(v1).toBe(1)
    expect(v2).toBe('11K')

    sb.send(2)
    expect(v1).toBe(2)
    expect(v2).toBe('12K')
  })

  test('3_2. map', () => {
    const rx = new RXEmitter<string, never>()
    let buffer = ''

    rx.pipe()
      .map(v => v.toUpperCase())
      .map(v => v ? v : '-')
      .onReceive(v => buffer += v)
      .subscribe()

    expect(buffer).toBe('')

    rx.send('a')
    rx.send('b')
    rx.send('')
    rx.send('c')
    expect(buffer).toBe('AB-C')
  })

  test('4. skipFirst', () => {
    const sb = new RXSubject(0)
    let buffer = ''
    sb.pipe()
      .skipFirst()
      .onReceive(value => (buffer += value))
      .subscribe()
    expect(buffer).toBe('')

    sb.send(2)
    expect(buffer).toBe('2')
    sb.sendComplete()

    sb.pipe()
      .skipFirst()
      .onReceive(value => (buffer += value))
      .subscribe()

    expect(buffer).toBe('2')
  })

  test('5. debounce', async () => {
    const sb = new RXSubject(1)
    let buffer1 = ''
    let buffer2 = ''
    sb.pipe()
      .debounce(100)
      .onReceive(value => (buffer1 += value))
      .onComplete(() => (buffer1 += 'c'))
      .subscribe()
    expect(buffer1).toBe('')

    sb.send(2)
    sb.send(3)

    await asyncDelay(10)
    sb.send(4)
    sb.sendComplete()
    sb.send(5)

    await asyncDelay(10)
    expect(buffer1).toBe('')

    await asyncDelay(200)

    expect(buffer1).toBe('4c')

    sb.pipe()
      .debounce(10)
      .onReceive(value => (buffer2 += value))
      .onComplete(() => (buffer2 += 'c'))
      .subscribe()
    expect(sb.isComplete).toBe(true)
    expect(buffer2).toBe('')

    await asyncDelay(50)
    expect(buffer2).toBe('4c')
  })

  test('6. removeDuplicates', () => {
    const sb = new RXSubject(0)
    let count = 0
    sb.pipe()
      .removeDuplicates()
      .map(v => v * v)
      .map(v => v + '')
      .onReceive(_ => count++)
      .subscribe()

    expect(count).toBe(1)

    sb.send(0)
    sb.send(0)
    sb.send(1)
    sb.send(1)
    sb.send(2)
    sb.send(2)
    sb.send(2)

    expect(count).toBe(3)
  })

  test('7. filter', () => {
    const rx = new RXSubject(0)
    let buffer = ''
    rx.pipe()
      .removeDuplicates()
      .filter(v => v % 2 === 0)
      .map(v => v + '')
      .filter(v => v.length === 1)
      .onReceive(v => (buffer += v))
      .subscribe()

    rx.send(0)
    rx.send(0)
    rx.send(1)
    rx.send(1)
    rx.send(2)
    rx.send(3)
    rx.send(4)
    rx.send(5)
    rx.send(6)
    rx.send(7)
    rx.send(8)
    rx.send(9)
    rx.send(10)
    rx.send(11)
    rx.send(12)

    expect(buffer).toBe('02468')
  })

  test('8. skipNullable', () => {
    const rx = new RXSubject<number | undefined | null, never>(0)
    let buffer = ''
    rx.pipe()
      .removeDuplicates()
      .skipNullable()
      .map(v => v + '')
      .onReceive(v => buffer += v)
      .subscribe()

    rx.send(0)
    rx.send(1)
    rx.send(undefined)
    rx.send(2)
    rx.send(3)
    rx.send(null)
    rx.send(4)
    rx.send(5)

    expect(buffer).toBe('012345')
  })

  test('9. two pipes', async () => {
    const sb = new RXSubject<number, never>(-2)
    let buffer1 = ''
    let buffer2 = ''

    sb.pipe()
      .removeDuplicates()
      .debounce(100)
      .map(v => v + '')
      .onReceive(v => (buffer1 += v))
      .subscribe()

    sb.pipe()
      .skipFirst()
      .filter(v => v % 2 === 0)
      .map(v => v + '-')
      .onReceive(v => (buffer2 += v))
      .subscribe()

    sb.send(0)
    sb.send(1)
    sb.send(1)
    sb.send(2)
    sb.send(2)
    sb.send(3)

    await asyncDelay(200)

    sb.send(3)
    sb.send(3)
    sb.send(4)
    sb.send(5)

    await asyncDelay(200)

    expect(buffer1).toBe('35')
    expect(buffer2).toBe('0-2-2-4-')
  })

  test('10. notification after complete', async () => {
    const sb = new RXSubject<number, never>(-2)
    let buffer1 = ''
    let buffer2 = ''
    let buffer3 = ''
    let buffer4 = ''
    let isPipe1Complete = 0
    let isPipe2Complete = 0
    let isPipe3Complete = 0
    let isPipe4Complete = 0

    sb.send(0)
    sb.send(1)
    sb.send(1)
    sb.send(2)
    sb.sendComplete()

    sb.pipe()
      .removeDuplicates()
      .debounce(100)
      .onReceive(v => (buffer1 += v))
      .onComplete(() => isPipe1Complete++)
      .subscribe()

    sb.pipe()
      .skipFirst()
      .filter(v => v % 2 === 0)
      .onReceive(v => (buffer2 += v))
      .onComplete(() => isPipe2Complete++)
      .subscribe()

    sb.pipe()
      .filter(v => v % 2 === 0)
      .map(v => v + '-')
      .onReceive(v => (buffer3 += v))
      .onComplete(() => isPipe3Complete++)
      .subscribe()

    sb.pipe()
      .skipFirst()
      .onReceive(v => (buffer4 += v))
      .onComplete(() => isPipe4Complete++)
      .subscribe()

    sb.send(2)
    sb.send(3)

    await asyncDelay(200)

    expect(buffer1).toBe('2')
    expect(isPipe1Complete).toBe(1)
    expect(buffer2).toBe('')
    expect(isPipe2Complete).toBe(1)
    expect(buffer3).toBe('2-')
    expect(isPipe3Complete).toBe(1)
    expect(buffer4).toBe('')
    expect(isPipe4Complete).toBe(1)
  })

  test('11. rejection', async () => {
    const sb = new RXSubject<number, string>(0)
    let buffer1 = ''
    let buffer2 = ''
    let buffer3 = ''

    sb.send(1)
    sb.send(2)

    sb.pipe()
      .debounce(100)
      .onReceive(v => (buffer1 += v))
      .onError(() => (buffer1 += 'e'))
      .onComplete(() => (buffer1 += 'c'))
      .subscribe()

    sb.sendError('Error')

    sb.pipe()
      .debounce(100)
      .onReceive(v => (buffer2 += v))
      .onError(() => (buffer2 += 'e'))
      .onComplete(() => (buffer2 += 'c'))
      .subscribe()

    sb.sendComplete()

    sb.pipe()
      .skipFirst()
      .filter(v => v % 2 === 0)
      .onReceive(v => (buffer3 += v))
      .onError(() => (buffer3 += 'e'))
      .onComplete(() => (buffer3 += 'c'))
      .subscribe()

    await asyncDelay(200)

    expect(buffer1).toBe('ec')
    expect(buffer2).toBe('ec')
    expect(buffer3).toBe('ec')
  })
})
