function initialUpdateQueue(fiber) {
  // 创建一个新的更新队列
  // pending其实是一个循环链表
  const queue = {
    shared: {
      pending: null,
    },
  }
  fiber.updateQueue = queue
}

function createUpdate() {
  return {}
}

function enqueueUpdate(fiber, update) {
  const updateQueue = fiber.updateQueue
  const shared = updateQueue.shared
  const pending = shared.pending
  if (pending === null) {
    update.next = update
  } else {
    // 如果更新队列不为空的话，取出第一个更新
    update.next = pending.next
    // 然后让原来队列的最后一个的 next 指向新的 next
    pending.next = update
  }
  // pending 指向链表最后一个元素
  updateQueue.shared.pending = update
}

function processUpdateQueue(fiber) {
  const queue = fiber.updateQueue
  const pending = queue.shared.pending
  if (pending !== null) {
    queue.shared.pending = null
    // 最后一个更新
    const lastPendingUpdate = pending
    const firstPendingUpdate = lastPendingUpdate.next
    // 把环状链表剪开
    lastPendingUpdate.next = null
    let newState = fiber.memoizedState
    let update = firstPendingUpdate
    while (update) {
      newState = getStateFromUpdate(update, newState)
      update = update.next
    }
    fiber.memoizedState = newState
  }
}

function getStateFromUpdate(update, newState) {
  return Object.assign({}, newState, update.payload)
}

let fiber = { memoizedState: { id: 1 } }
initialUpdateQueue(fiber)
let update1 = createUpdate()
update1.payload = { name: 'zhufeng' }
enqueueUpdate(fiber, update1)

let update2 = createUpdate()
update2.payload = { age: 14 }
enqueueUpdate(fiber, update2)

// 基于老状态，计算新状态
processUpdateQueue(fiber)
console.log('fiber.memoizedState:', fiber.memoizedState)
