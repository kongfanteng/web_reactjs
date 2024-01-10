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
  NoLanes,
  SyncLane,
  getHighestPriorityLane,
  getNextLanes,
  markRootUpdated,
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

/**
 * description: 根节点计划更新函数
 * @param {*} root 根节点
 * @param {*} fiber 要更新的 fiber
 * @param {*} lane 要更新的 lane
 */
export function scheduleUpdateOnFiber(root, fiber, lane) {
  markRootUpdated(root, lane)
  // 确保调度执行 root 上的更新
  ensureRootIsScheduled(root)
}
/**
 * description: 保证 root 已经被调度
 * @param {Fiber} root
 */
function ensureRootIsScheduled(root) {
  // 获取当前优先级最高的车道
  const nextLanes = getNextLanes(root, NoLanes) // 16
  let newCallbackPriority = getHighestPriorityLane(nextLanes) // 16
  if (newCallbackPriority === SyncLane) {
    // 先把 performSyncWorkOnRoot 添回到同步队列中
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root))
    // 再把 flushSyncCallbacks 放入微任务
    queueMicrotask(flushSyncCallbacks)
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
    Scheduler_scheduleCallback(
      schedulerPriorityLevel,
      performConcurrentWorkOnRoot.bind(null, root)
    )
  }
  if (workInProgressRoot) return
  workInProgressRoot = root
}

/**
 * description：根据 fiber 构建 fiber 树，创建真实 DOM，把真实 DOM 挂载到根节点上
 * @param {*} root
 */
function performConcurrentWorkOnRoot(root) {
  // 获取当前优先级最高的车道
  const nextLanes = getNextLanes(root, NoLanes) // 16
  if (nextLanes === NoLanes) {
    return null
  }
  // 第一次渲染以同步的方式渲染根节点，初次渲染的时候，都是同步
  renderRootSync(root, nextLanes)
  // 开始进入提交阶段, 就是执行副作用, 修改真实 DOM
  const finishedWork = root.current.alternate
  root.finishedWork = finishedWork
  commitRoot(root)
  workInProgressRoot = null
  return null
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
  const { finishedWork } = root
  workInProgressRoot = null
  workInProgressRootRenderLanes = null
  printFinishedWork(finishedWork)
  if (
    (finishedWork.subtr00Flags & Passive) !== NoFlags ||
    (finishedWork.flags & Passive) !== NoFlags
  ) {
    if (!rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = true
      scheduleCallback(NormalSchedulerPriority, flushPassiveEffect)
    }
  }
  console.log('开始commit~~~~~~~~~~~~~~~~~~~~~')
  // 判断子树有没有副作用
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags
  // 如果自己的副作用或者子节点有副作用就进行提交 DOM 操作
  if (subtreeHasEffects || rootHasEffect) {
    console.log('DOM执行变更commitMutationEffectsOnFiber~~~~~~~~~~~~~~~~~~~~~')
    // 当 DOM 执行变更之后
    commitMutationEffectsOnFiber(finishedWork, root)
    console.log('DOM执行变更commitLayoutEffects~~~~~~~~~~~~~~~~~~~~~')
    // 执行 layout effect
    commitLayoutEffects(finishedWork, root)
    if (rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = false
      rootWithPendingPassiveEffects = root
    }
  }
  // 等 DOM 变更后, 就可以把让 root 的 current 指向新的 fiber 树
  root.current = finishedWork
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
}

/**
 * description: 准备刷新栈
 * @param {*} root
 */
function prepareFreshStack(root, renderLanes) {
  if (
    root !== workInProgressRoot ||
    workInProgressRootRenderLanes !== renderLanes
  ) {
    workInProgress = createWorkInProgress(root.current, null)
  }
  workInProgressRootRenderLanes = renderLanes
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
