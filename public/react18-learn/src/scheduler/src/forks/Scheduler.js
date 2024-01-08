import { push, peek, pop } from './SchedulerMinHeap'
import {
  NormalPriority,
  ImmediatePriority,
  UserBlockingPriority,
  LowPriority,
  IdlePriority,
} from './SchedulerPriorities'

var maxSigned31BitInt = 1073741823
// Times out immediatelyvar
var IMMEDIATE_PRIORITY_TIMEOUT = -1
// Eventually times out
var USER_BLOCKING_PRIORITY_TIMEOUT = 250 // 正常优先级的过期时间
var NORMAL_PRIORITY_TIMEOUT = 5000
// 低优先级过期时间
var LOW_PRIORITY_TIMEOUT = 10000
// Never times out 永远不过期
var IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt
// 任务 ID 计数器
var taskCounter = 1
// 任务的最小堆
var taskQueue = []
let schedulerHostCallback = null
let startTime = null
let currentTask = null
// React 每一帧向浏览器申请 5 毫秒用于自己的任务执行
// 如果 5ms 内没有完成任务，React 也会放弃控制权，把控制权交给浏览器
const frameInterval = 5
const channel = new MessageChannel()
var port2 = channel.port2
var port1 = channel.port1
port1.onmessage = performWorkUntilDeadline

/**
 * description: 调度器
 * @param {function} WorkLoop 刷新工作
 */
function requestHostCallback(workLoop) {
  // 回调函数
  schedulerHostCallback = workLoop
  // 执行工作直到截止时间
  schedulePerformWorkUntilDeadline()
}
function performWorkUntilDeadline() {
  if (schedulerHostCallback) {
    // 先获取开始执行任务的时间
    //表示时间片的开始
    startTime = getCurrentTime()
    // 是否有更多的工作要做
    let hasMoreWork = true
    try {
      //执行 flushWork ，并判断有没有返回值
      hasMoreWork = schedulerHostCallback(startTime)
    } finally {
      //执行完以后如果为true,说明还有更多工作要做
      if (hasMoreWork) {
        //继续执行
        schedulePerformWorkUntilDeadline()
      } else {
        schedulerHostCallback = null
      }
    }
  }
}

function getCurrentTime() {
  return performance.now()
}
/**
 * description: 调度器
 * @param {number} priorityLevel 优先级
 * @param {function} callback 任务函数
 */
export function scheduleCallback(priorityLevel, callback) {
  // 获取当前的时候
  const currentTime = getCurrentTime()
  // 此任务的开始时间
  const startTime = currentTime
  //超时时间
  let timeout
  switch (priorityLevel) {
    case ImmediatePriority:
      timeout = IMMEDIATE_PRIORITY_TIMEOUT // -1
      break
    case UserBlockingPriority:
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT // 250ms
      break
    case LowPriority:
      timeout = LOW_PRIORITY_TIMEOUT // 1000
      break
    case IdlePriority:
      timeout = IDLE_PRIORITY_TIMEOUT // 1073741823
      break
    case NormalPriority:
    default:
      timeout = NORMAL_PRIORITY_TIMEOUT
  }
  // 计算此任务的过期时间
  const expirationTime = startTime + timeout
  const newTask = {
    id: taskCounter++,
    callback, // 回调函数或者任务函数
    priorityLevel, // 优先级
    startTime, // 任务开始时间
    expirationTime, // 任务的过期时间
    sortIndex: expirationTime, // 排序依赖
  }
  // 向任务最小堆中添加此任务，排序的依据是过期时间
  push(taskQueue, newTask)
  // flushWork 执行工作，刷新工作，执行任务，司机接人
  requestHostCallback(workLoop)
  return newTask
}

function schedulePerformWorkUntilDeadline() {
  // 发送消息
  port2.postMessage(null)
}

/**
 * description: 开始执行任务队列中的任务
 * @param {number} startTime 开始执行任务的时间
 */
// function flushWork(startTime) {
//   return workLoop(startTime)
// }

/**
 * description: 执行任务函数
 * @param {number} startTime 开始执行任务的时间
 */
function workLoop(startTime) {
  let currentTime = startTime
  // 取出优先级最高的任务-局长
  currentTask = peek(taskQueue)
  while (currentTask !== null) {
    // 如果此任务的过期时间小于当前时间，也就是没有过期，并且需要放弃，时间片到期
    if (currentTask.expirationTime > currentTime && shouldYieldToHost()) {
      // 跳出工作循环
      break
    }
    // 取出当前的任务中的回调函数 performConcurrentWorkOnRoot
    const callback = currentTask.callback
    if (typeof callback === 'function') {
      currentTask.callback = null
      // 执行工作，如果返回新的函数，则表示当前的工作没有完成
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime
      const continuationCallback = callback(didUserCallbackTimeout)
      if (typeof continuationCallback === 'function') {
        currentTask.callback = continuationCallback
        return true // has more work
      }
      // 如果此任务已经完成，则不需要再继续执行，可以把此任务弹出
      if (currentTask === peek(taskQueue)) {
        // 取出堆顶的任务，即优先级最高的任务
        pop(taskQueue)
      }
    } else {
      pop(taskQueue)
    }
    // 如果循环结束还有未完成的任务，那就表示 hasMoreWork = true
    currentTask = peek(taskQueue)
  }
  // 如果循环结束还有未完成的任务，那就表示 hasMoreWork = true
  if (currentTask !== null) {
    return true
  }
  // 没有任何要完成的任务了
  return false
}

/**
 * description: 是否要让主线程执行
 */
function shouldYieldToHost() {
  // 用当前时间减去开始时间就是过去时间
  const timeElapsed = getCurrentTime() - startTime
  // 如果流逝或者说经过的时间小于 5 毫秒，那就不需要放弃执行
  if (timeElapsed < frameInterval) {
    return false
  }
  // 否则需要放弃执行
  return true
}

export {
  scheduleCallback as unstable_scheduleCallback,
  shouldYieldToHost as shouldYield,
  ImmediatePriority as unstable_ImmediatePriority,
  UserBlockingPriority as unstable_UserBlockingPriority,
  NormalPriority as unstable_NormalPriority,
  LowPriority as unstable_LowPriority,
  IdlePriority as unstable_IdlePriority,
}
