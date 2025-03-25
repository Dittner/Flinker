import {describe, expect, test} from '@jest/globals'
import {
  RXDelayedComplete,
  RXEmitter,
  type RXObservable,
  RXObservableValue,
  RXOperation,
  RXSubject
} from '../../src/rx/RXPublisher.ts'
import {RX} from '../../src/rx/RX.ts'
import {asyncDelay} from '../../src/rx/Utils.ts'

describe('RxOperation Module', () => {
  test('0. default state', () => {
    const op = new RXOperation<number, never>()
    let buffer1 = ''
    let buffer2 = ''
    let buffer3 = ''
    op.pipe()
      .onReceive(value => {
        console.log('Test 0: onReceive1: ', value)
        buffer1 += value + ''
      })
      .onError((e) => {
        console.log('Test 0: onError1: ', e)
        buffer1 += 'e'
      })
      .onComplete(() => {
        console.log('Test 0: onComplete')
        buffer1 += 'c'
      })
      .subscribe()

    //RXOperation should remove children after complete
    const p = op.pipe().filter(v => v !== 0)

    console.log('Test 0: success 10')
    op.success(10)

    op.pipe()
      .onReceive(value => (buffer2 += value + ''))
      .onError(() => (buffer2 += 'e'))
      .onComplete(() => (buffer2 += 'c'))
      .subscribe()

    p.onReceive(value => (buffer3 += value + ''))
      .onError(() => (buffer3 += 'e'))
      .onComplete(() => (buffer3 += 'c'))
      .subscribe()

    expect(buffer1).toBe('10c')
    expect(buffer2).toBe('10c')
    expect(buffer3).toBe('')
  })

  test('1. success after fail', () => {
    const op = new RXOperation<number, void>()
    let buffer1 = ''
    let buffer2 = ''

    op.pipe()
      .onReceive(value => (buffer1 += value + ''))
      .onError(() => (buffer1 += 'e'))
      .onComplete(() => (buffer1 += 'c'))
      .subscribe()

    op.fail()
    op.fail()
    op.success(10)
    op.success(10)

    op.pipe()
      .onReceive(value => (buffer2 += value + ''))
      .onError(() => (buffer2 += 'e'))
      .onComplete(() => (buffer2 += 'c'))
      .subscribe()

    expect(buffer1).toBe('ec')
    expect(buffer2).toBe('ec')
  })

  test('2. fail after success', () => {
    const op = new RXOperation<number, void>()
    let buffer1 = ''
    let buffer2 = ''

    op.pipe()
      .onReceive(value => (buffer1 += value + ''))
      .onError(() => (buffer1 += 'e'))
      .onComplete(() => (buffer1 += 'c'))
      .subscribe()

    op.success(10)
    op.success(20)
    op.fail()
    op.fail()

    op.pipe()
      .onReceive(value => (buffer2 += value + ''))
      .onError(() => (buffer2 += 'e'))
      .onComplete(() => (buffer2 += 'c'))
      .subscribe()

    expect(buffer1).toBe('10c')
    expect(buffer2).toBe('10c')
  })

  test('3. parallel complete of timers', async() => {
    let buffer = ''
    const runTimer = (id: string) => {
      setTimeout(() => {
        buffer += id
      }, 100)
    }
    runTimer('a')
    runTimer('b')
    runTimer('c')
    runTimer('d')
    runTimer('e')
    runTimer('f')
    await asyncDelay(110)
    expect(buffer).toBe('abcdef')
  })

  test('4. debounce', async() => {
    const op = new RXOperation<number, void>()
    let buffer1 = ''
    let buffer2 = ''
    op.pipe()
      .debounce(100)
      .onReceive(value => (buffer1 += value + ''))
      .onError(() => (buffer1 += 'e'))
      .onComplete(() => (buffer1 += 'c'))
      .subscribe()

    op.success(10)
    // op.success(20)
    // op.fail()
    // op.fail()

    op.pipe()
      .debounce(100)
      .onReceive(value => (buffer2 += value + ''))
      .onError(() => (buffer2 += 'e'))
      .onComplete(() => (buffer2 += 'c'))
      .subscribe()

    expect(buffer1).toBe('')
    expect(buffer2).toBe('')

    await asyncDelay(110)

    expect(buffer1).toBe('10c')
    expect(buffer2).toBe('10c')
  })

  test('5. replaceWith', async() => {
    const op = new RXOperation<string, string>()
    let buffer1 = ''
    let buffer2 = ''
    let buffer3 = ''
    op.pipe()
      .replaceError((e) => e === 'e' ? '-' : null)
      .onReceive(value => (buffer1 += value))
      .onError((e) => (buffer1 += e))
      .onComplete(() => (buffer1 += 'c'))
      .subscribe()

    op.pipe()
      .debounce(100)
      .replaceError((e) => e === 'x' ? '!' : null)
      .onReceive(value => (buffer2 += value + '!'))
      .onError((e) => (buffer2 += e))
      .onComplete(() => (buffer2 += 'c'))
      .subscribe()

    op.fail('e')
    op.fail('x')
    op.success('s')

    op.pipe()
      .debounce(100)
      .replaceError(() => '*')
      .onReceive(value => (buffer3 += value))
      .onError((e) => (buffer3 += e))
      .onComplete(() => (buffer3 += 'c'))
      .subscribe()

    await asyncDelay(110)

    expect(buffer1).toBe('-c')
    expect(buffer2).toBe('ec')
    expect(buffer3).toBe('*c')
  })

  test('6. void result', async() => {
    const op = new RXOperation<void, void>()
    let buffer1 = ''
    let buffer2 = ''
    op.pipe()
      .debounce(100)
      .onReceive(() => (buffer1 += 'v'))
      .onError(() => (buffer1 += 'e'))
      .onComplete(() => (buffer1 += 'c'))
      .subscribe()

    op.success()
    op.success()
    op.fail()
    op.fail()

    op.pipe()
      .debounce(100)
      .onReceive(() => (buffer2 += 'v'))
      .onError(() => (buffer2 += 'e'))
      .onComplete(() => (buffer2 += 'c'))
      .subscribe()

    expect(buffer1).toBe('')
    expect(buffer2).toBe('')

    await asyncDelay(110)

    expect(buffer1).toBe('vc')
    expect(buffer2).toBe('vc')
  })

  test('7. combine list of publishers', async() => {
    const op1 = new RXSubject<number, void>(0)
    const op2 = new RXOperation<string, void>()
    const op3 = new RXOperation<string, void>()
    let buffer = ''

    const container = RX.combine(op1, op2, op3)

    container.pipe()
      .onReceive(values => {
        buffer = ''
        values.forEach(v => (buffer += v ?? '-'))
      })
      .onError(() => (buffer += 'e'))
      .onComplete(() => (buffer += 'c'))
      .subscribe()

    expect(buffer).toBe('0--')
    op1.send(1)
    expect(buffer).toBe('1--')

    await asyncDelay(5)

    op2.success('x')
    expect(buffer).toBe('1x-')

    await asyncDelay(5)

    op3.success('y')

    expect(buffer).toBe('1xy')

    await asyncDelay(5)

    op1.send(2)
    op1.sendComplete()

    expect(buffer).toBe('2xyc')
    expect(op1.isComplete).toBe(true)
    expect(op2.isComplete).toBe(true)
    expect(op3.isComplete).toBe(true)

    op2.fail()
    op3.success('!!!')
    op1.send(100)

    expect(buffer).toBe('2xyc')

    buffer = ''
    container.pipe()
      .onReceive(values => {
        values.forEach(v => (buffer += v ?? '-'))
      })
      .onError(() => (buffer += 'e'))
      .onComplete(() => (buffer += 'c'))
      .subscribe()

    expect(buffer).toBe('2xyc')
  })

  test('8. RXObservableValue', async() => {
    let buffer = ''
    const $ob = new RXObservableValue(1)
    $ob.pipe()
      .onReceive(v => buffer += v)
      .subscribe()

    expect(buffer).toBe('1')

    $ob.value = 2
    await asyncDelay(10)
    expect(buffer).toBe('12')
  })

  test('9. wait until list of publishers complete', async() => {
    const op1 = RX.justComplete<boolean, any>(false)
    const op2 = new RXSubject<number, any>(0)
    const op3 = new RXOperation<string, any>()
    const resultPublisher = new RXSubject<number, any>(5)
    let buffer = ''

    const container = RX.waitUntilComplete([op1, op2, op3], resultPublisher)

    container.pipe()
      .onReceive(v => {
        buffer += v + ''
      })
      .onError(() => (buffer += 'e'))
      .onComplete(() => (buffer += 'c'))
      .subscribe()

    expect(buffer).toBe('')
    op2.send(1)
    expect(buffer).toBe('')

    op2.sendComplete()
    expect(buffer).toBe('')

    resultPublisher.send(2)
    expect(buffer).toBe('')

    resultPublisher.sendComplete()
    expect(buffer).toBe('')

    op3.success('3')
    expect(buffer).toBe('2c')

    resultPublisher.send(7)
    expect(buffer).toBe('2c')

    container.pipe()
      .onReceive(v => {
        buffer += v + ''
      })
      .onError(() => (buffer += 'e'))
      .onComplete(() => (buffer += 'c'))
      .subscribe()

    expect(buffer).toBe('2c2c')
  })

  test('10. wait until list of publishers complete without resul', async() => {
    const op1 = RX.justComplete<boolean, any>(false)
    const op2 = new RXSubject<number, any>(0)
    const op3 = new RXOperation<string, any>()
    let buffer = ''

    const container = RX.waitUntilComplete([op1, op2, op3])

    container.pipe()
      .onReceive(v => {
        buffer += v + ''
      })
      .onError(() => (buffer += 'e'))
      .onComplete(() => (buffer += 'c'))
      .subscribe()

    expect(buffer).toBe('')
    op2.send(1)
    expect(buffer).toBe('')

    op2.sendComplete()
    expect(buffer).toBe('')

    op3.success('3')
    expect(buffer).toBe('c')

    expect(buffer).toBe('c')

    container.pipe()
      .onReceive(v => {
        buffer += v + ''
      })
      .onError(() => (buffer += 'e'))
      .onComplete(() => (buffer += 'c'))
      .subscribe()

    expect(buffer).toBe('cc')
  })

  test('11. just complete', async() => {
    const op = RX.justComplete(200)
    expect(op.isComplete).toBe(true)

    let buffer1 = ''
    let buffer2 = ''
    op.pipe()
      .onReceive(v => (buffer1 += v))
      .onError(e => (buffer1 += e))
      .onComplete(() => (buffer1 += 'c'))
      .subscribe()

    op.pipe()
      .debounce(100)
      .onReceive(v => (buffer2 += v))
      .onError(e => (buffer2 += e))
      .onComplete(() => (buffer2 += 'c'))
      .subscribe()

    expect(buffer1).toBe('200c')
    expect(buffer2).toBe('')

    await asyncDelay(110)

    expect(buffer1).toBe('200c')
    expect(buffer2).toBe('200c')
  })

  test('12. just only complete', async() => {
    const op = RX.justComplete()
    expect(op.isComplete).toBe(true)

    let buffer1 = ''
    let buffer2 = ''
    op.pipe()
      .onReceive(v => (buffer1 += v + '!!!'))
      .onError(e => (buffer1 += e))
      .onComplete(() => (buffer1 += 'c'))
      .subscribe()

    op.pipe()
      .debounce(100)
      .onReceive(v => (buffer2 += v + '!!!'))
      .onError(e => (buffer2 += e))
      .onComplete(() => (buffer2 += 'c'))
      .subscribe()

    expect(buffer1).toBe('c')
    expect(buffer2).toBe('')

    await asyncDelay(110)

    expect(buffer1).toBe('c')
    expect(buffer2).toBe('c')
  })

  test('13. delayed complete', async() => {
    const op = RX.delayedComplete(10, 'v')
    expect(op.isComplete).toBe(false)

    let buffer1 = ''
    let buffer2 = ''
    let buffer3 = ''
    op.pipe()
      .onReceive(v => (buffer1 += v))
      .onError(e => (buffer1 += e))
      .onComplete(() => (buffer1 += 'c'))
      .subscribe()

    op.pipe()
      .debounce(20)
      .onReceive(v => (buffer2 += v))
      .onError(e => (buffer2 += e))
      .onComplete(() => (buffer2 += 'c'))
      .subscribe()

    expect(buffer1).toBe('')
    expect(buffer2).toBe('')

    await asyncDelay(50)

    expect(op.isComplete).toBe(true)
    expect(buffer1).toBe('vc')
    expect(buffer2).toBe('vc')

    op.pipe()
      .onReceive(v => (buffer3 += v))
      .onError(e => (buffer3 += e))
      .onComplete(() => (buffer3 += 'c'))
      .subscribe()

    expect(buffer1).toBe('vc')
  })

  test('14. just error', async() => {
    const op = RX.justError(400)
    expect(op.isComplete).toBe(true)

    let buffer1 = ''
    let buffer2 = ''
    op.pipe()
      .onReceive(v => (buffer1 += v))
      .onError(e => (buffer1 += e))
      .onComplete(() => (buffer1 += 'c'))
      .subscribe()

    op.pipe()
      .debounce(100)
      .onReceive(v => (buffer2 += v))
      .onError(e => (buffer2 += e))
      .onComplete(() => (buffer2 += 'c'))
      .subscribe()

    expect(buffer1).toBe('400c')
    expect(buffer2).toBe('')

    await asyncDelay(110)

    expect(buffer1).toBe('400c')
    expect(buffer2).toBe('400c')
  })

  test('15. spread', async() => {
    const op1 = new RXOperation<string[], void>()
    let buffer1 = ''
    op1.pipe()
      .spread()
      .onReceive(v => (buffer1 += v + '-'))
      .onError(e => (buffer1 += e))
      .onComplete(() => (buffer1 += 'c'))
      .subscribe()
    expect(buffer1).toBe('')
    op1.success(['1', '2', '3'])
    expect(buffer1).toBe('1-2-3-c')

    //ignore spread for no array value
    const op2 = new RXOperation<number, void>()
    let buffer2 = ''
    op2.pipe()
      .spread()
      .onReceive(v => (buffer2 += v + '-'))
      .onError(e => (buffer2 += e))
      .onComplete(() => (buffer2 += 'c'))
      .subscribe()
    expect(buffer2).toBe('')
    op2.success(200)
    expect(buffer2).toBe('200-c')
  })

  test('16. flatMap', async() => {
    const pow = (v: number): RXObservable<number, void> => {
      const e = new RXEmitter<number, void>()
      setTimeout(() => {
        e.send(v * v)
      }, 20)
      return e.asObservable
    }

    const negate = (v: number): RXObservable<number, void> => {
      const op = new RXOperation<number, void>()
      setTimeout(() => {
        op.success(v * (-1))
      }, 20)
      return op.asObservable
    }

    const subject = new RXSubject<number, void>(0)
    let buffer1 = ''
    let buffer2 = ''
    subject.pipe()
      .flatMap(v => pow(v))
      .onReceive(v => (buffer1 += v))
      .onError(() => (buffer1 += 'e'))
      .onComplete(() => (buffer1 += 'c'))
      .subscribe()

    subject.pipe()
      .flatMap(v => pow(v))
      .flatMap(v => negate(v))
      .onReceive(v => (buffer2 += v))
      .onError(() => (buffer2 += 'e'))
      .onComplete(() => (buffer2 += 'c'))
      .subscribe()

    expect(buffer1).toBe('')
    expect(buffer2).toBe('')

    subject.send(1)
    subject.send(2)

    expect(buffer1).toBe('')
    expect(buffer2).toBe('')

    await asyncDelay(30)
    expect(buffer1).toBe('014')
    expect(buffer2).toBe('')

    await asyncDelay(30)

    expect(buffer1).toBe('014')
    expect(buffer2).toBe('0-1-4')

    subject.sendComplete()
    subject.send(3)

    expect(buffer1).toBe('014c')
    expect(buffer2).toBe('0-1-4c')

    await asyncDelay(60)

    expect(buffer1).toBe('014c')
    expect(buffer2).toBe('0-1-4c')
  })

  test('17. flatMap after complete', async() => {
    const subject = new RXSubject<number, void>(0)
    let buffer1 = ''
    let buffer2 = ''
    subject.pipe()
      .flatMap(v => {
        return new RXDelayedComplete<number, void>(10, v)
      })
      .onReceive(v => (buffer1 += v))
      .onError(() => (buffer1 += 'e'))
      .onComplete(() => (buffer1 += 'c'))
      .subscribe()

    expect(buffer1).toBe('')
    expect(buffer2).toBe('')

    subject.send(1)
    subject.send(2)
    subject.sendComplete()
    subject.send(3)

    expect(buffer1).toBe('c')

    await asyncDelay(30)
    expect(buffer1).toBe('c')

    subject.pipe()
      .flatMap(v => {
        return new RXDelayedComplete<number, void>(10, v)
      })
      .onReceive(v => (buffer2 += v))
      .onError(() => (buffer2 += 'e'))
      .onComplete(() => (buffer2 += 'c'))
      .subscribe()

    expect(buffer2).toBe('c')
    await asyncDelay(30)
    expect(buffer2).toBe('c')
  })

  test('18. from', async() => {
    const op = RX.from([0, 1, 2])
    expect(op.isComplete).toBe(true)

    let buffer1 = ''
    op.pipe()
      .onReceive(v => buffer1 += v + '-')
      .onComplete(() => buffer1 += 'c')
      .subscribe()
    expect(buffer1).toBe('0-1-2-c')

    let buffer2 = ''
    op.pipe()
      .debounce(10)
      .onReceive(v => buffer2 += v + '-')
      .onComplete(() => buffer2 += 'c')
      .subscribe()

    await asyncDelay(50)
    expect(buffer2).toBe('2-c')
  })

  test('19. sequent', async() => {
    const op = RX.from([0, 1, 2, 3])
    expect(op.isComplete).toBe(true)

    let buffer1 = ''
    op.pipe()
      .sequent(v => { return RX.delayedComplete(10, v * v) })
      .onReceive(v => buffer1 += v + '-')
      .onComplete(() => buffer1 += 'c')
      .subscribe()
    expect(buffer1).toBe('')

    await asyncDelay(50)

    expect(buffer1).toBe('0-1-4-9-c')

    let buffer2 = ''
    op.pipe()
      .sequent(v => { return RX.delayedComplete(10, v * v) })
      .onReceive(v => buffer2 += v + '-')
      .onComplete(() => buffer2 += 'c')
      .subscribe()
    expect(buffer2).toBe('')

    await asyncDelay(50)

    expect(buffer2).toBe('0-1-4-9-c')
  })

  test('20. sequent with error', async() => {
    const op = RX.from([0, 1, 2, 3])
    expect(op.isComplete).toBe(true)

    let buffer1 = ''
    op.pipe()
      .sequent(v => { return v === 2 ? RX.delayedError(10, 'e') : RX.delayedComplete(10, v * v) })
      .onReceive(v => buffer1 += v + '-')
      .onError(e => buffer1 += e + '-')
      .onComplete(() => buffer1 += 'c')
      .subscribe()
    expect(buffer1).toBe('')

    await asyncDelay(50)

    expect(buffer1).toBe('0-1-e-9-c')

    let buffer2 = ''
    op.pipe()
      .filter(v => v % 2 === 1)
      .sequent(v => { return v === 2 ? RX.delayedError(10, 'e') : RX.delayedComplete(10, v * v) })
      .onReceive(v => buffer2 += v + '-')
      .onError(e => buffer2 += e + '-')
      .onComplete(() => buffer2 += 'c')
      .subscribe()
    expect(buffer2).toBe('')

    await asyncDelay(50)

    expect(buffer2).toBe('1-9-c')
  })

  test('21. parallel', async() => {
    const op = RX.from([0, 30, 10, 20])
    expect(op.isComplete).toBe(true)

    let buffer1 = ''
    op.pipe()
      .parallel(ms => { return RX.delayedComplete(ms, ms) })
      .onReceive(v => buffer1 += v + '-')
      .onComplete(() => buffer1 += 'c')
      .subscribe()
    expect(buffer1).toBe('')

    await asyncDelay(100)

    expect(buffer1).toBe('0-10-20-30-c')

    let buffer2 = ''
    op.pipe()
      .parallel(ms => { return RX.delayedComplete(ms, ms) })
      .onReceive(v => buffer2 += v + '-')
      .onComplete(() => buffer2 += 'c')
      .subscribe()
    expect(buffer2).toBe('')

    await asyncDelay(100)

    expect(buffer2).toBe('0-10-20-30-c')
  })

  test('21. queue', async() => {
    let buffer1 = ''
    const q = RX.queue<string, Error>()

    q.asObservable.pipe()
      .onReceive(v => buffer1 += v)
      .onError(e => buffer1 += 'e')
      .onComplete(() => buffer1 += 'c')
      .subscribe()

    q
      .next(() => {
        return RX.justComplete(1)
      })
      .next((num) => {
        return RX.delayedComplete(10, num + 'a')
      })
      .next((str) => {
        return RX.justComplete(str + 'b')
      })
      .complete()

    expect(q.isComplete).toBe(false)
    expect(buffer1).toBe('')

    await asyncDelay(50)
    expect(buffer1).toBe('1abc')

    let buffer2 = ''
    q.asObservable.pipe()
      .onReceive(v => buffer2 += v)
      .onError(e => buffer2 += 'e')
      .onComplete(() => buffer2 += 'c')
      .subscribe()
    expect(buffer2).toBe('1abc')
  })

  test('22. queue - procedure style', async() => {
    let buffer1 = ''
    let buffer2 = ''
    const q = RX.queue<string, Error>()

    q.asObservable.pipe()
      .onReceive(v => v !== undefined && (buffer1 += v))
      .onError(e => buffer1 += 'e')
      .onComplete(() => buffer1 += 'c')
      .subscribe()

    q
      .next(() => {
        buffer2 += '1'
        return RX.justComplete()
      })
      .next(() => {
        buffer2 += '2'
        return RX.delayedComplete(10)
      })
      .next(() => {
        buffer2 += '3'
        return RX.justComplete()
      })
      .complete()

    expect(q.isComplete).toBe(false)
    expect(buffer1).toBe('')

    await asyncDelay(50)
    expect(buffer1).toBe('c')
    expect(buffer2).toBe('123')
  })

  test('23. queue with error', async() => {
    let buffer1 = ''
    const q = RX.queue<string, Error>()

    q.asObservable.pipe()
      .onReceive(v => buffer1 += v)
      .onError(e => buffer1 += e)
      .onComplete(() => buffer1 += 'c')
      .subscribe()

    q
      .next(() => {
        return RX.justError('e')
      })
      .next((num) => {
        return RX.delayedComplete(10, num + 'a')
      })
      .next((str) => {
        return RX.justComplete(str + 'b')
      })
      .complete()

    expect(q.isComplete).toBe(true)
    expect(buffer1).toBe('ec')

    await asyncDelay(50)
    expect(buffer1).toBe('ec')

    let buffer2 = ''
    q.asObservable.pipe()
      .onReceive(v => buffer2 += v)
      .onError(e => buffer2 += 'e')
      .onComplete(() => buffer2 += 'c')
      .subscribe()
    expect(buffer2).toBe('ec')
  })

  test('24. forEach', async() => {
    const op = RX.from([0, 1, 2, 3])
    expect(op.isComplete).toBe(true)

    let buffer1 = ''
    op.pipe()
      .forEach(v => { return RX.delayedComplete(10, v * v) })
      .onReceive(v => buffer1 += v + '-')
      .onComplete(() => buffer1 += 'c')
      .subscribe()
    expect(buffer1).toBe('')

    await asyncDelay(50)

    expect(buffer1).toBe('0-1-4-9-c')

    let buffer2 = ''
    op.pipe()
      .forEach(v => { return RX.delayedComplete(10, v * v) })
      .onReceive(v => buffer2 += v + '-')
      .onComplete(() => buffer2 += 'c')
      .subscribe()
    expect(buffer2).toBe('')

    await asyncDelay(50)

    expect(buffer2).toBe('0-1-4-9-c')
  })

  test('25. forEach with error', async() => {
    const op = RX.from([0, 1, 2, 3])
    expect(op.isComplete).toBe(true)

    let buffer1 = ''
    op.pipe()
      .forEach(v => { return v === 2 ? RX.delayedError(10, 'e') : RX.delayedComplete(10, v * v) })
      .onReceive(v => buffer1 += v + '-')
      .onError(e => buffer1 += e + '-')
      .onComplete(() => buffer1 += 'c')
      .subscribe()
    expect(buffer1).toBe('')

    await asyncDelay(50)

    expect(buffer1).toBe('0-1-e-9-c')

    let buffer2 = ''
    op.pipe()
      .filter(v => v % 2 === 1)
      .forEach(v => { return v === 2 ? RX.delayedError(10, 'e') : RX.delayedComplete(10, v * v) })
      .onReceive(v => buffer2 += v + '-')
      .onError(e => buffer2 += e + '-')
      .onComplete(() => buffer2 += 'c')
      .subscribe()
    expect(buffer2).toBe('')

    await asyncDelay(50)

    expect(buffer2).toBe('1-9-c')
  })
})
