import { markUpdateLaneFromFiberToRoot } from './ReactFiberConcurrentUpdates'

import assign from 'shared/assign'
export const UpdateState = 0

export function enqueueUpdate(fiber, update) {
  const updateQueue = fiber.updateQueue
  const pending = updateQueue.pending
  if (pending == null) {
    update.next = update
  } else {
    update.next = pending.next
    pending.next = update
  }
  // pending 要指向最后一个更新，最后一个更新 next 指向第一个更新
  // 单向循环链表
  updateQueue.shared.pending = update
  // 返回根节点 从当前的 fiber 直接到根节点
  // 待写逻辑：更新优先级（最后）
  let root = markUpdateLaneFromFiberToRoot(fiber)
  return root
}

/**
 * 初始化更新队列
 */
export function initialUpdateQueue(fiber) {
  // 创建一个新的更新队列
  // pending其实是一个循环链表
  const queue = {
    shared: {
      pending: null,
    },
  }
  fiber.updateQueue = queue
}

/**
 * 根据老状态和更新队列中的更新计算最新的状态
 * @param {*} workInProgress - 要计算的 fiber
 */
export function processUpdateQueue(workInProgress) {
  const queue = workInProgress.updateQueue
  const pendingQueue = queue.shared.pending
  // 如果有更新，或者说更新队列里有内容
  if (pendingQueue !== null) {
    // 清除等待生效的更新
    queue.shared.pending = null
    // 获取更新队列中最后一个更新 update = { payload:{ element:'h1' } }
    const lastPendingUpdate = pendingQueue
    // 指向第一个更新
    const firstPendingUpdate = lastPendingUpdate.next
    // 把更新链表剪开，变成一个单链表
    lastPendingUpdate.next = null
    // 获取老状态 null
    let newState = workInProgress.memoizedState
    let update = firstPendingUpdate
    while (update) {
      // 根据老状态和更新计算新状态
      newState = getStateFromUpdate(update, newState)
      update = update.next
    }
    //把最终计算到的状态赋值给 memoizedState
    workInProgress.memoizedState = newState
  }
}
/**
 * 根据老状态和更新计算新状态
 * @desc state=>0 update=>1 update=>2
 * @param {*} update - 更新的对象其实有很多种类型
 * @param {*} prevState
 */
function getStateFromUpdate(update, prevState) {
  switch (update.tag) {
    case UpdateState:
      const { payload } = update
      return assign({}, prevState, payload)
  }
}

export function createUpdate() {
  const update = { tag: UpdateState }
  return update
}
