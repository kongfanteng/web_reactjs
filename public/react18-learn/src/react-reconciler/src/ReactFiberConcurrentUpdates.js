import { mergeLanes } from './ReactFiberLane'
import { HostRoot } from './ReactWorkTags'
const concurrentQueue = []
let concurrentQueueIndex = 0
/**
 * description: 更新队列中插入更新函数
 * @param {Object} fiber 函数组件中对应的 fiber
 * @param {Object} queue 本 hook 对应的更新队列
 * @param {Object} update 更新对象
 */
export function enqueueConcurrentHookUpdate(fiber, queue, update, lane) {
  enqueueUpdate(fiber, queue, update, lane)
  return getRootForUpdatedFiber(fiber)
}

/**
 * description: 更新队列中插入更新函数
 * @param {Object} fiber 函数组件中对应的 fiber
 * @param {Object} queue 本 hook 对应的更新队列
 * @param {Object} update 更新对象
 * @param {lane} lane  共享队列的lane
 */
export function enqueueConcurrentClassUpdate(fiber, queue, update, lane) {
  enqueueUpdate(fiber, queue, update, lane)
  return getRootForUpdatedFiber(fiber)
}

function getRootForUpdatedFiber(sourceFiber) {
  let node = sourceFiber
  let parent = node.return
  while (parent !== null) {
    node = parent
    parent = node.return
  }
  return node.tag === HostRoot ? node.stateNode : null
}
/**
 * description: 把更新缓存到 concurrentQueue 数组中
 * @param {Object} fiber 函数组件中对应的 fiber
 * @param {Object} queue 本 hook 对应的更新队列
 * @param {Object} update 更新对象
 */
function enqueueUpdate(fiber, queue, update, lane) {
  // 0124 setNumber1 4567 setNumber2
  concurrentQueue[concurrentQueueIndex++] = fiber // 函数组件对应的 fiber
  concurrentQueue[concurrentQueueIndex++] = queue // 要更新的 hook 对应的更新队列
  concurrentQueue[concurrentQueueIndex++] = update // 更新对象
  concurrentQueue[concurrentQueueIndex++] = lane // 更新的 lane
  // 当我们向一个 fiber 上添加一个更新的时候，要把此更新的赛道合并到此 fiber 的赛道上
  fiber.lanes = mergeLanes(fiber.lanes, lane)
}
/**
 * 本来此文件要处理更新优先级的
 * 目前现在只实现向上找到根节点
 */
export function markUpdateLaneFromFiberToRoot(sourceFiber) {
  let node = sourceFiber // 当前fiber
  let parent = sourceFiber.return // 当前 fiber 的父 fiber
  while (parent !== null) {
    node = parent
    parent = parent.return
  }
  // 一直找到 parent 为 null
  if (node.tag === HostRoot) {
    return node.stateNode
  }
  return null
}
export function finishQueueingConcurrentUpdates() {
  const endIndex = concurrentQueueIndex
  concurrentQueueIndex = 0
  let i = 0
  while (i < endIndex) {
    const fiber = concurrentQueue[i++]
    const queue = concurrentQueue[i++]
    const update = concurrentQueue[i++]
    const lane = concurrentQueue[i++]
    if (queue !== null && update !== null) {
      const pending = queue.pending
      if (pending === null) {
        update.next = update
      } else {
        update.next = pending.next
        pending.next = update
      }
      queue.pending = update
    }
  }
}
