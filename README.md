## Intro
__Flinker__ is a functional reactive programming library. __Flinker__ is not limited to user interfaces. It also can be adapted to React.js (e.g. [flinker-react](https://github.com/Dittner/Flinker-React)) or your own frontend framework (e.g. [flinker-dom](https://github.com/Dittner/FlinkerDom)).

## RXPublisher, RXPipeline, RXOperator and RXSubscriber
Four key concepts: publisher, pipeline, operator and subscriber. A publisher provides data when available and upon request. To subscribe to changes, the publisher provides the `pipe()` method, which creates a pipeline.

RXPipeline is a queue of operators (RXOperator) to control the flow of data. Operators are a convenient name for a number of pre-built functions such as: map, flatMap, filter, debounce, etc. 

Subscribers are responsible for accepting the data (and possible errors) provided by a publisher. Subscribers are joined to the end of a pipeline.

A publisher is generating and sending data, operators are reacting to that data and potentially changing it, and subscribers accepting result. RXPublisher cannot be used directly, its subclasses must be used instead:

+ RXObservableValue
+ RXObservableEntity
+ RXSubject
+ RXEmitter
+ RXOperation
+ RXBuffer
+ RXCombine
+ RXJustComplete
+ RXDelayedComplete
+ RXJustError
+ RXDelayedError
+ RXFrom
+ RXQueue

## RXObservableValue
It does not dispatch errors and completion, has a default value.

```ts
let buffer = ''
const rx = new RXObservableValue(1) // extends RXPublisher
rx.pipe() // creates RXPipeline
  .onReceive(v => buffer += v) // creates RXSubscriber
  .subscribe() // returns unsubscribe function: () => void

expect(buffer).toBe('1') //true

rx.value = 2
rx.value = 3

expect(buffer).toBe('123') //true
```

## RXOperation
It dispatches value or error and immediately after that completion.

```ts
const op = new RXOperation<number, void>()
let buffer1 = ''
let buffer2 = ''

op.pipe()
  .onReceive(v => (buffer1 += v + ''))
  .onError(() => (buffer1 += 'e'))
  .onComplete(() => (buffer1 += 'c'))
  .subscribe()

op.fail()
op.fail() // no effect
op.success(10) // no effect
op.success(20) // no effect

op.pipe()
  .onReceive(value => (buffer2 += value + ''))
  .onError(() => (buffer2 += 'e'))
  .onComplete(() => (buffer2 += 'c'))
  .subscribe()

expect(buffer1).toBe('ec') // true
expect(buffer2).toBe('ec') // true
```

## RXSubject
It has a default value. If you do not want to have a default value use RXEmitter instead.

```ts
const rx = new RXSubject(0)
let buffer = -1

rx.pipe()
  .onReceive(v => buffer = v)
  .subscribe()

expect(buffer).toBe(0) // true

rx.send(1)
expect(buffer).toBe(1) // true

rx.sendComplete()
expect(buffer).toBe(1) // true

rx.send(2) // no effect after complete
expect(buffer).toBe(1) // true
```

## Map Operator
```ts
const rx = new RXEmitter<string, never>()
let buffer = ''

rx.pipe()
  .map(v => v.toUpperCase())
  .map(v => v ? v : '-')
  .onReceive(v => buffer += v)
  .subscribe()

expect(buffer).toBe('') // true

rx.send('a')
rx.send('b')
rx.send('')
rx.send('c')
expect(buffer).toBe('AB-C') // true
```

## Filter Operator
```ts
const rx = new RXSubject(0)
let buffer = ''

rx.pipe()
  .removeDuplicates()
  .filter(v => v % 2 === 0)
  .map(v => v + '')
  .filter(v => v.length === 1)
  .onReceive(v => buffer += v)
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

expect(buffer).toBe('02468') // true
```

## SkipNullable Operator
```ts
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
rx.send(2)
rx.send(3)
rx.send(null)
rx.send(4)
rx.send(5)

expect(buffer).toBe('012345') // true
```

## FlatMap Operator
Transforms all elements from an upstream publisher into a new publisher.

```ts
class Task {
  readonly $isDone = new RXObservableValue(false)
}

const task = new Task()
const $selectedTask = new RXObservableValue<Task | undefined>(undefined)
let buffer = ''

$selectedTask.pipe()
  .skipNullable()
  .flatMap(t => t.$isDone)
  .onReceive(isDone => buffer = isDone + '')
  .subscribe()

expect(buffer).toBe('') // no submission: selectedTask is undefined

$selectedTask.value = task
expect(buffer).toBe('false') // buffer is updated with default value false

task.$isDone.value = true
expect(buffer).toBe('true') // buffer is updated with value true
```

## More examples
You can find more examples in the test-folder: [https://github.com/Dittner/Flinker/tree/main/test/rx](https://github.com/Dittner/Flinker/tree/main/test/rx)

## Install
```code
npm i flinker
```

## License
MIT