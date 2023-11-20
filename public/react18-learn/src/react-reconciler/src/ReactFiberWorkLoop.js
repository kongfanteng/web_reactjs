import { scheduleCallback } from 'scheduler'
import { createWorkInProgress } from './ReactFiber'
import { beginWork } from './ReactFiberBeginWork'

let workInProgress = null

/**
 * 计划更新 root
 * 源码中此处有一个任务的功能
 * @param {*}root
 */
export function scheduleUpdateOnFiber(root) {
  // 确保调度执行 root 上的更新
  ensureRootIsScheduled(root)
}
function ensureRootIsScheduled(root) {
  //告诉 浏览器要执行 performConcurrentWorkOnRoot
  scheduleCallback(performConcurrentWorkOnRoot.bind(null, root))
}
function performConcurrentWorkOnRoot(root) {
  // 第一次渲染以同步的方式渲染根节点，初次渲染的时候，都是同步
  renderRootSync(root)
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

function performUnitOfWork(unitOfWork) {
  // 获取新的 fiber 对应的老 fiber
  const current = unitOfWork.alternate
  // 完成当前 fiber 的子 fiber 链表构建后
  const next = beginWork(current, unitOfWork)
  unitOfWork.memoizedProps = unitOfWork.pendingProps
  if (next === null) {
    // 如果没有子节点表示当前的 fiber 已经完成了
    workInProgress = null
    // completeUnitofWork(unitOfWork);
  } else {
    // 如果有子节点，就让子节点成为下一个工作单元
    workInProgress = next
  }
}

function prepareFreshStack(root) {
  workInProgress = createWorkInProgress(root.current, null)
}
