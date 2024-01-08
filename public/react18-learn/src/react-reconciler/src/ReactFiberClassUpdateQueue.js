import { enqueueConcurrentClassUpdate, markUpdateLaneFromFiberToRoot } from './ReactFiberConcurrentUpdates'

import assign from 'shared/assign'
export const UpdateState = 0

/**
 * description: 调度更新函数
 * @param {Fiber} fiber 要更新的fiber
 * @param {object} update 更新函数
 * @param {number} lane 调度优先级
 */
export function enqueueUpdate(fiber, update, lane) {
  // 获取更新队列
  const updateQueue = fiber.updateQueue
  // 获取共享队列
  const sharedQueue = updateQueue.shared
  return enqueueConcurrentClassUpdate(fiber, sharedQueue, update, lane)
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

/**
 * description: 创建更新函数
 */
export function createUpdate(lane) {
  const update = { tag: UpdateState, lane, next: null }
  return update
}

export function cloneUpdateQueue(current, workInProgress) {
  const workInProgressQueue = workInProgress.updateQueue
  const currentQueue = current.updateQueue
  if (currentQueue === workInProgressQueue) {
    const clone = {
      base: currentQueue.baseState,
      firstBaseUpdate: currentQueue.firstBaseUpdate,
      lastBaseUpdate: currentQueue.lastBaseUpdate,
      shared: currentQueue.shared,
    }
    workInProgress.updateQueue = clone
  }
}
