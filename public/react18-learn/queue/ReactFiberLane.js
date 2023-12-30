const NoLanes = 0b00
const NoLane = 0b00
const SyncLane = 0b01 //1
const InputContinuousHydrationLane = 0b10 //2
function initializeUpdateQueue(fiber) {
  const queue = {
    baseState: fiber.memoizedState, // 本次更新当前fiber的状态，更新会与它进行计算
    firstBaseUpdate: null, // 上次跳过的更新链表头
    lastBaseUpdate: null, // 上次跳过的更新链表尾
    shared: {
      pending: null,
    },
  }
  fiber.updateQueue = queue
}

function enqueueUpdate(fiber, update) {
  const updateQueue = fiber.updateQueue
  const sharedQueue = updateQueue.shared
  const pending = sharedQueue.pending
  if (pending === null) {
    update.next = update
  } else {
    update.next = pending.next
    pending.next = update
  }
  sharedQueue.pending = update
}

function processUpdateQueue(fiber, renderLanes) {
  const queue = fiber.updateQueue
  // 老链表的头部
  let firstBaseUpdate = queue.firstBaseUpdate
  // 老链表的尾部
  let lastBaseUpdate = queue.lastBaseUpdate
  // 新链表的尾部
  const pendingQueue = queue.shared.pending
  if (pendingQueue !== null) {
    queue.shared.pending = null
    // 新链表的尾部
    const lastPendingUpdate = pendingQueue
    // 新链表的头部
    const firstPendingUpdate = lastPendingUpdate.next
    // 把老链表剪断，变成单链表
    lastPendingUpdate.next = null
    // 如果没有老链表
    if (lastBaseUpdate === null) {
      // 指向新的链表头
      firstBaseUpdate = firstPendingUpdate
    } else {
      lastBaseUpdate.next = firstPendingUpdate
    }
    lastBaseUpdate = lastPendingUpdate
  }
  // 如果不为空 firstBaseUpdate => lastBaseUpdate
  if (firstBaseUpdate !== null) {
    // 上次跳过的更新前的状态
    let newState = queue.baseState
    // 尚未执行的更新的 lane
    let newLanes = NoLanes
    let newBaseState = null
    let newFirstBaseUpdate = null
    let newLastBaseUpdate = null
    let update = firstBaseUpdate // update4
    do {
      // 获取此更新车道
      const updateLane = update.lane
      // 如果优先级不够，需要保存跳过的更新到baseQueue
      if (!isSubsetOfLanes(renderLanes, updateLane)) {
        // 把此克隆一份
        const clone = {
          id: update.id,
          lane: updateLane,
          payload: update.payload,
        }
        // 说明新的跳过的 base 链表为空，说明当前这个更新是第一个跳过的更新
        if (newLastBaseUpdate === null) {
          // 让新的跳过的链表头和链表尾都指向这个第一次跳过的更新
          newFirstBaseUpdate = newLastBaseUpdate = clone
          // 计算保存新的baseState为此跳过更新时的state
          newBaseState = newState // ""
        } else {
          newLastBaseUpdate = newLastBaseUpdate.next = clone
        }
        newLanes = mergeLanes(newLanes, updateLane)
      } else {
        // 说明已经有跳过的更新了
        if (newLastBaseUpdate !== null) {
          const clone = {
            id: update.id,
            lane: NoLane,
            payload: update.payload,
          }
          newLastBaseUpdate = newLastBaseUpdate.next = clone
        }
        newState = getStateFromUpdate(update, newState)
      }
      update = update.next
    } while (update)
    // 如果没能跳过的更新的话
    if (!newLastBaseUpdate) {
      newBaseState = newState
    }
    queue.baseState = newBaseState
    queue.firstBaseUpdate = newFirstBaseUpdate
    queue.lastBaseUpdate = newLastBaseUpdate
    fiber.lanes = newLanes
    // 本次渲染完会判断，此 fiber 上还有没有不为 0 的 lane，如果有，会再次渲染
    fiber.memoizedState = newState
  }
}

function isSubsetOfLanes(set, subset) {
  return (set & subset) === subset
}
function mergeLanes(a, b) {
  return a | b
}
// function getStateFromUpdate(update, prevState) {
//   const payload = update.payload
//   let partialState = payload(prevState)
//   return Object.assign({}, prevState, partialState)
// }

function getStateFromUpdate(update, prevState) {
  return update.payload(prevState)
}

// 新建 fiber
// 演示如何给 fiber 添加不同优先级的更新
// 在执行渲染的时候总是优先级最高的执行，跳过优先级低的执行
let fiber = { memoizedState: '' }
initializeUpdateQueue(fiber)
let updateA = {
  id: 'A',
  payload: (state) => state + 'A',
  lane: InputContinuousHydrationLane,
}
enqueueUpdate(fiber, updateA)
let updateB = { id: 'B', payload: (state) => state + 'B', lane: SyncLane }
enqueueUpdate(fiber, updateB)
let updateC = {
  id: 'C',
  payload: (state) => state + 'C',
  lane: InputContinuousHydrationLane,
}
enqueueUpdate(fiber, updateC)
let updateD = { id: 'D', payload: (state) => state + 'D', lane: SyncLane }
enqueueUpdate(fiber, updateD)
// 处理新队列
processUpdateQueue(fiber, SyncLane)
console.log('fiber.memoizedState:', fiber.memoizedState) // fiber.memoizedState: BD

// 此时会把 ABCD 这个链接放在 baseQueue 中
let updateE = {
  id: 'E',
  payload: (state) => state + 'E',
  lane: InputContinuousHydrationLane,
}
enqueueUpdate(fiber, updateE)
let updateF = { id: 'F', payload: (state) => state + 'F', lane: SyncLane }
enqueueUpdate(fiber, updateF)
// 先链接两个链表，再进行计算
processUpdateQueue(fiber, InputContinuousHydrationLane)
console.log('updateQueue:', printUpdateQueue(fiber.updateQueue))
console.log('fiber.memoizedState:', fiber.memoizedState)

function printUpdateQueue(updateQueue) {
  const { baseState, firstBaseUpdate } = updateQueue
  let desc = baseState + '#'
  let update = firstBaseUpdate
  while (update) {
    desc += update.id + '=>'
    update = update.next
  }
  desc += 'null'
  return desc
}
