import { scheduleCallback } from 'scheduler'
import { createWorkInProgress } from './ReactFiber'
import { beginWork } from './ReactFiberBeginWork'
import { commitMutationEffectsOnFiber } from './ReactFiberCommitWork'
import { completeWork } from './ReactFiberCompleteWork'
import {
  ChildDeletion,
  MutationMask,
  NoFlags,
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

let workInProgress = null
let workInProgressRoot = null

/**
 * 计划更新 root
 * 源码中此处有一个任务的功能
 * @param {*} root
 */
export function scheduleUpdateOnFiber(root) {
  // 确保调度执行 root 上的更新
  ensureRootIsScheduled(root)
}
function ensureRootIsScheduled(root) {
  if (workInProgressRoot) return
  workInProgressRoot = root
  //告诉 浏览器要执行 performConcurrentWorkOnRoot
  scheduleCallback(performConcurrentWorkOnRoot.bind(null, root))
}
function performConcurrentWorkOnRoot(root) {
  // 第一次渲染以同步的方式渲染根节点，初次渲染的时候，都是同步
  renderRootSync(root)
  // 开始进入提交阶段, 就是执行副作用, 修改真实 DOM
  const finishedWork = root.current.alternate
  root.finishedWork = finishedWork
  commitRoot(root)
  workInProgressRoot = null
}

function getFlags(fiber) {
  const { flags, deletions } = fiber
  switch (flags) {
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
  const { finishedWork } = root
  printFinishedWork(finishedWork)
  console.log('~~~~~~~~~~~~~~~~~~~~~')
  // 判断子树有没有副作用
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags
  // 如果自己的副作用或者子节点有副作用就进行提交 DOM 操作
  if (subtreeHasEffects || rootHasEffect) {
    commitMutationEffectsOnFiber(finishedWork, root)
  }
  // 等 DOM 变更后, 就可以把让 root 的 current 指向新的 fiber 树
  root.current = finishedWork
}

function renderRootSync(root) {
  // 开始构建 fiber 树
  prepareFreshStack(root)
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
  const next = beginWork(current, unitOfWork)
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

function prepareFreshStack(root) {
  workInProgress = createWorkInProgress(root.current, null)
  finishQueueingConcurrentUpdates()
}
