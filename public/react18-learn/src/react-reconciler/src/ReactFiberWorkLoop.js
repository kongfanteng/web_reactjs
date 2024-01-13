import { createWorkInProgress } from './ReactFiber'
import { beginWork } from './ReactFiberBeginWork'
import { completeWork } from './ReactFiberCompleteWork'
import {
  ChildDeletion,
  MutationMask,
  NoFlags,
  Passive,
  Placement,
  Update,
} from './ReactFiberFlags'
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from './ReactWorkTags'
import { finishQueueingConcurrentUpdates } from './ReactFiberConcurrentUpdates'
import {
  commitMutationEffectsOnFiber, // 执行 DOM 操作
  commitPassiveUnmountEffects, // 执行 destroy
  commitPassiveMountEffects, // 执行 create
  commitLayoutEffects,
} from './ReactFiberCommitWork'
import {
  NoLane,
  NoLanes,
  NoTimestamp,
  SyncLane,
  getHighestPriorityLane,
  getNextLanes,
  includesBlockingLane,
  includesExpiredLane,
  markRootFinished,
  markRootUpdated,
  markStarvedLanesAsExpired,
} from './ReactFiberLane'
import { getCurrentEventPriority } from 'react-dom-bindings/src/client/ReactDOMHostConfig'
import {
  getCurrentUpdatePriority,
  lanesToEventPriority,
  DiscreteEventPriority,
  ContinuousEventPriority,
  DefaultEventPriority,
  IdleEventPriority,
  setCurrentUpdatePriority,
} from './ReactEventPriorities'
import {
  scheduleCallback as Scheduler_scheduleCallback,
  shouldYield,
  ImmediatePriority as ImmediateSchedulerPriority,
  UserBlockingPriority as UserBlockingSchedulerPriority,
  NormalPriority as NormalSchedulerPriority,
  IdlePriority as IdleSchedulerPriority,
  cancelCallback as Scheduler_cancelCallback,
  now,
} from './Scheduler'
import {
  scheduleSyncCallback,
  flushSyncCallbacks,
} from './ReactFiberSyncTaskQueue'

let workInProgress = null
let workInProgressRoot = null // 正在构建中的根
let rootDoesHavePassiveEffect = false // 此根节点上有没有useEffect类似的副作用
let rootWithPendingPassiveEffects = null // 具有useEffect副作用的根节点 FiberRootNode,根fiber.stateNode
let workInProgressRootRenderLanes = NoLanes

// 构建 fiber 树正在进行中
const RootInProgress = 0
//构建 fiber 树已经完成
const RootCompleted = 5
//当渲染工作结束的时候当前的 fiber 树处于什么状态,默认进行中
let workInProgressRootExitStatus = RootInProgress
//保存当前的事件发生的时间
let currentEventTime = NoTimestamp

/**
 * description: 计划更新 root
 * 源码中此处有一个任务的功能水
 * @param {*} root
 * @param {*} fiber
 * @param {*} lane
 * @param {*} eventTime
 */
export function scheduleUpdateOnFiber(root, fiber, lane, eventTime) {
  markRootUpdated(root, lane)
  // 确保调度执行 root 上的更新
  ensureRootIsScheduled(root, eventTime)
}
/**
 * description: 保证 root 已经被调度
 * @param {Fiber} root
 */
function ensureRootIsScheduled(root, currentTime) {
  // 先获取当前根上执行任务
  const existingCallbackNode = root.callbackNode
  // 把所有饿死的赛道标记为过期
  markStarvedLanesAsExpired(root, currentTime)
  // 获取当前优先级最高的车道
  const nextLanes = getNextLanes(root, workInProgressRootRenderLanes) //16
  // 如果没有车道，则不进行调度
  if (nextLanes === NoLanes) {
    return
  }
  // 获取新的调度优先级
  let newCallbackPriority = getHighestPriorityLane(nextLanes) // 16
  // 获取现在根上正在运行的优先级
  const existingCallbackPriority = root.callbackPriority
  // 如果新的优先级和老的优先级一样，则可以进行批量更新
  // QR-两次批量更新进行合并？目的，fiber 渲染一次；
  if (existingCallbackPriority === newCallbackPriority) {
    return
  }

  if (existingCallbackNode !== null) {
    console.log('cancelCallback', existingCallbackNode)
    Scheduler_cancelCallback(existingCallbackNode)
  }
  // 新的回调任务
  let newCallbackNode
  if (newCallbackPriority === SyncLane) {
    // 先把 performSyncWorkOnRoot 添回到同步队列中
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root))
    // 再把 flushSyncCallbacks 放入微任务
    queueMicrotask(flushSyncCallbacks)
    // 如果同步执行的话
    newCallbackNode = null
  } else {
    // 如果不是同步，就需要调度一个新的任务
    let schedulerPriorityLevel
    switch (lanesToEventPriority(nextLanes)) {
      case DiscreteEventPriority:
        schedulerPriorityLevel = ImmediateSchedulerPriority
        break
      case ContinuousEventPriority:
        schedulerPriorityLevel = UserBlockingSchedulerPriority
        break
      case DefaultEventPriority:
        schedulerPriorityLevel = NormalSchedulerPriority
        break
      case IdleEventPriority:
        schedulerPriorityLevel = IdleSchedulerPriority
        break
      default:
        schedulerPriorityLevel = NormalSchedulerPriority
        break
    }
    newCallbackNode = Scheduler_scheduleCallback(
      schedulerPriorityLevel,
      performConcurrentWorkOnRoot.bind(null, root)
    )
  }
  // 在根节点的执行的任务是 newCallbackNode
  root.callbackNode = newCallbackNode
  root.callbackPriority = newCallbackPriority
}

/**
 * description：根据 fiber 构建 fiber 树，创建真实 DOM，把真实 DOM 挂载到根节点上
 * @param {*} root
 */
function performConcurrentWorkOnRoot(root, didTimeout) {
  // 先获取当前根节点上的任务
  const originalCallbackNode = root.callbackNode
  // 获取当前优先级最高的车道
  const lanes = getNextLanes(root, NoLanes) //16
  if (lanes !== NoLanes) {
    return null
  }
  // 如果不包含阻塞的车道，并且没有超时，就可以并行渲染,就是启用时间分片
  // 所以说默认更新车道是同步的,不能启用时间分片
  // 是否不包含阻塞车道
  const nonIncludesBlockingLane = !includesBlockingLane(root, lanes)
  // 是否不包含过期的车道
  const nonIncludesExpiredLane = !includesExpiredLane(root, lanes)
  // 时间片没有过期
  const nonTimedOut = !didTimeout
  // 如果不包含阻塞的车道，并且没有超时，就可以并行渲染,就是启用时间分片
  // 所以说默认更新车道是同步的，不能启用时间分片
  // 三个变量都是真，才能进行时间分片，也就是进行并发渲染，也就是可以中断执行
  const shouldTimeSlice =
    nonIncludesBlockingLane && nonIncludesExpiredLane && nonTimedOut
  console.log('shouldTimeSlice:', shouldTimeSlice)
  // 第一次渲染以同步的方式渲染根节点，初次渲染的时候，都是同步
  const exitStatus = shouldTimeSlice
    ? renderRootConcurrent(root, lanes)
    : renderRootSync(root, lanes)
  // 如果不是渲染中的话，那说明肯定渲染完了
  if (exitStatus !== RootInProgress) {
    const finishedWork = root.current.alternate
    root.finishedWork = finishedWork
    commitRoot(root)
  }
  // 说明任务没有完成
  if (root.callbackNode === originalCallbackNode) {
    // 把此函数返回，下次接着干
    return performConcurrentWorkOnRoot.bind(null, root)
  }
  return null
}

function renderRootConcurrent(root, lanes) {
  // 因为在构建 fiber 树的过程中，此方法会反复进入，会进入多次
  // 只有在第一次进来的时候会创建新的 fiber 树，也就是新的 fiber 树
  if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
    prepareFreshStack(root, lanes)
  }
  // 在当前分配的时间片(5ms)内执行 fiber 树的构建或者说渲染
  workLoopConcurrent()
  // 如果 workInProgress 不为 null，说明 fiber 树的构建还没有完成
  if (workInProgress !== null) {
    return RootInProgress
  }
  // 如果 workInProgress 是null了说明渲染工作完全结束了
  return workInProgressRootExitStatus
}

function getFlags(fiber) {
  const { flags, deletions } = fiber
  switch (flags) {
    case Placement | Update:
      return '移动'
    case Placement:
      return '插入'
    case Update:
      return '更新'
    case ChildDeletion:
      return (
        '子节点有删除' +
        deletions
          .map((fiber) => `${fiber.key}#${fiber.memoizedProps.id}`)
          .join(',')
      )
    default:
      return flags
  }
}

function getTag(tag) {
  switch (tag) {
    case FunctionComponent:
      return 'FunctionComponent'
    case HostRoot:
      return 'HostRoot'
    case HostComponent:
      return 'HostComponent'
    case HostText:
      return 'HostText'
    case FunctionComponent:
      return 'FunctionComponent'
    default:
      break
  }
}

function printFinishedWork(fiber) {
  const { flags, deletions } = fiber
  // if (flags === ChildDeletion) {
  //   fiber.flags &= ~ChildDeletion
  //   console.log(
  //     '子节点有删除-------' +
  //       deletions.map((fiber) => `${fiber.type}#${fiber.memoizedProps.id}`)
  //   )
  // }

  let child = fiber.child
  while (child) {
    printFinishedWork(child)
    child = child.sibling
  }
  if (fiber.flags !== 0) {
    console.log(
      getFlags(fiber),
      getTag(fiber.tag),
      fiber.type,
      fiber.memoizedProps
    )
  }
}

function commitRoot(root) {
  const previousUpdatePriority = getCurrentUpdatePriority()
  try {
    setCurrentUpdatePriority(DiscreteEventPriority)
    commitRootImpl(root)
  } finally {
    // 完成提交
    setCurrentUpdatePriority(previousUpdatePriority)
  }
}

function commitRootImpl(root) {
  // 先获取新的构建好的 fiber 树的根 fiber tag=3
  const { finishedWork } = root
  console.log('commit', finishedWork.child.memoizedState.memoizedState[0])
  workInProgressRoot = null
  workInProgressRootRenderLanes = NoLanes
  root.callbackNode = null
  root.callbackPriority = NoLane
  // 合并统计当前新的根上剩下的车道
  const remainingLanes = mergeLanes(finishedWork.lanes, finishedWork.childLanes)
  markRootFinished(root, remainingLanes)
  if (
    (finishedWork.subtreeFlags & Passive) !== NoFlags ||
    (finishedWork.flags & Passive) !== NoFlags
  ) {
    if (!rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = true
      Scheduler_scheduleCallback(NormalSchedulerPriority, flushPassiveEffect)
    }
  }
  // printFinishedWork(finishedWork)
  // console.log('开始commit~~~~~~~~~~~~~~~~~~~~~')
  // 判断子树有没有副作用
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags
  // 如果自己的副作用或者子节点有副作用就进行提交 DOM 操作
  if (subtreeHasEffects || rootHasEffect) {
    // console.log('DOM执行变更commitMutationEffectsOnFiber~~~~~~~~~~~~~~~~~~~~~')
    // 当 DOM 执行变更之后
    commitMutationEffectsOnFiber(finishedWork, root)
    // console.log('DOM执行变更commitLayoutEffects~~~~~~~~~~~~~~~~~~~~~')
    // 执行 layout effect
    commitLayoutEffects(finishedWork, root)
    if (rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = false
      rootWithPendingPassiveEffects = root
    }
  }
  // 等 DOM 变更后, 就可以把让 root 的 current 指向新的 fiber 树
  // 在提交之后，因为根上可能会有跳过的更新，所以需要重新再次调度
  root.current = finishedWork
  // 在提交之后，因为根上可能会有跳过的更新，所以需要重新再次调度
  ensureRootIsScheduled(root, now())
}

function flushPassiveEffect() {
  console.log('下一个宏任务中 flushPassiveEffect~~~~~~~~~~~~~~~~~~~~~')
  if (rootWithPendingPassiveEffects !== null) {
    const root = rootWithPendingPassiveEffects
    // 执行卸载副作用，destroy
    commitPassiveUnmountEffects(root.current)
    // 执行挂载副作用 create
    commitPassiveMountEffects(root, root.current)
  }
}

/**
 * description: 渲染根同步
 * @param {Fiber} root
 */
function renderRootSync(root, renderLanes) {
  // 如果新的根和老的根不一样，或者新的渲染优先级和老的渲染优先级不一样
  if (
    root !== workInProgressRoot ||
    workInProgressRootRenderLanes !== renderLanes
  ) {
    prepareFreshStack(root, renderLanes)
  }
  workLoopSync()
  return RootCompleted
}

function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

/**
 * 执行一个工作单元
 * @param {*} unitOfWork
 */
function performUnitOfWork(unitOfWork) {
  // 获取新的 fiber 对应的老 fiber
  const current = unitOfWork.alternate
  // 完成当前 fiber 的子 fiber 链表构建后
  const next = beginWork(current, unitOfWork, workInProgressRootRenderLanes)
  unitOfWork.memoizedProps = unitOfWork.pendingProps
  if (next === null) {
    // 如果没有子节点表示当前的 fiber 已经完成了
    completeUnitOfWork(unitOfWork)
  } else {
    // 如果有子节点，就让子节点成为下一个工作单元
    workInProgress = next
  }
}

function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork
  do {
    const current = completedWork.alternate
    const returnFiber = completedWork.return
    // 执行此 fiber 的完成工作, 如果是原生组件的话就是创建真实的 DOM 节点
    completeWork(current, completedWork)
    // 如果有弟弟, 就构建弟弟对应的 fiber 子链表
    const siblingFiber = completedWork.sibling
    if (siblingFiber !== null) {
      workInProgress = siblingFiber
      return
    }
    // 如果没有弟弟, 说明这当前完成的就是父 fiber 的最后一个节点
    // 也就是说一个父 fiber,所有的子 fiber 全部完成了
    completedWork = returnFiber
    workInProgress = completedWork
  } while (completedWork !== null)
  // 如果走到了这里，说明整个 fiber 树全部构建完毕,把构建状态设置为空成
  if (workInProgressRootExitStatus === RootInProgress) {
    workInProgressRootExitStatus = RootCompleted
  }
}

// function prepareFreshStack(root, renderLanes) {
//   if (
//     root !== workInProgressRoot ||
//     workInProgressRootRenderLanes !== renderLanes
//   ) {
//     workInProgress = createWorkInProgress(root.current, null)
//   }
//   workInProgressRootRenderLanes = renderLanes
//   finishQueueingConcurrentUpdates()
// }

/**
 * description: 准备刷新栈
 * @param {*} root
 */
function prepareFreshStack(root, renderLanes) {
  workInProgress = createWorkInProgress(root.current, null)
  workInProgressRootRenderLanes = renderLanes
  workInProgressRoot = root
  finishQueueingConcurrentUpdates()
}

/**
 * description: 请求一个更新车道
 * @param current: 当前的根 fiber
 * @return: 返回一个更新车道
 * @description:
 * 1. 从当前的根fiber中获取更新车道
 * 2. 如果更新车道为空，创建一个更新车道
 * 3. 返回更新车道
 * @example:
 */
export function requestUpdateLane() {
  const updateLane = getCurrentUpdatePriority()
  if (updateLane !== NoLanes) {
    return updateLane
  }
  const eventLane = getCurrentEventPriority()
  return eventLane
}

/**
 * description: 在根上执行同步工作
 * @param {*} root
 */
function performSyncWorkOnRoot(root) {
  // 获得最高优的 lane
  const lanes = getNextLanes(root)
  // 渲染新的 fiber 树
  renderRootSync(root, lanes)
  // 获取新渲染完成的 fiber 根节点
  const finishedWork = root.current.alternate
  root.finishedWork = finishedWork
  commitRoot(root)
  return null
}

function sleep(duration) {
  const timeStamp = new Date().getTime()
  const endTime = timeStamp + duration
  while (true) {
    if (new Date().getTime() > endTime) {
      return
    }
  }
}

function workLoopConcurrent() {
  // 如果有下一个要构建的 fiber 并且时间片没有过期
  while (workInProgress !== null && !shouldYield()) {
    console.log('shouldYield()', shouldYield(), workInProgress)
    sleep(5)
    performUnitOfWork(workInProgress)
  }
}

// 请求当前的时间
export function requestEventTime() {
  currentEventTime = now()
  return currentEventTime // performance.now
}
