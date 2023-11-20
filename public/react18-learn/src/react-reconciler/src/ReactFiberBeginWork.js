import logger from 'shared/logger'
import { mountChildFibers, reconcileChildFibers } from './ReactChildFiber'
import { processUpdateQueue } from './ReactFiberClassUpdateQueue'
import { HostComponent, HostRoot, HostText } from './ReactWorkTags'
import { shouldSetTextContent } from 'react-dom-bindings/src/ReactDOMHostConfig'

/**
 * 根据新的虚拟 DOM 生成新的 Fiber 链表
 * @param {*} current - 老的父 Fiber
 * @param {*} workInProgress 新的父 Fiber
 * @param {*} nextchildren - 新的子虚拟 DOM
 */
function reconcileChildren(current, workInProgress, nextChildren) {
  // 如果此新 fiber 没有老 fiber,说明此新 fiber 是新创建的，如果这个父fiber是新的创建的，它的儿子们也肯定都是新创建的
  if (current === null) {
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren)
  } else {
    // 如果说有老 Fiber 的话，做 DOM-DIFF，拿老的子 fiber 链表和新的子虚拟 DOM 进行比较，进行最小化的更新
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren
    )
  }
}
function updateHostRoot(current, workInProgress) {
  // 需要知道它的子虚拟 DOM，知道它的儿子的虚拟 DOM 信息
  processUpdateQueue(workInProgress) // workInProgress.memoizedState={ element }
  const nextState = workInProgress.memoizedState
  // nextChildren 就是新的子虚拟 DOM
  const nextChildren = nextState.element
  // 协调子节点 DOM-DIFF 算法
  // 根据新的虚拟 DOM 生成了 fiber 链表
  reconcileChildren(current, workInProgress, nextChildren)
  return workInProgress.child // { tag: 5, type: "h1" }
}
/**
 * 构建原生组件的子 fiber 链表
 * @param {*} current - 老 fiber
 * @param {*} workInProgress - 新 fiber
 */
function updateHostComponent(current, workInProgress) {
  const { type } = workInProgress
  const nextProps = workInProgress.pendingProps
  let nextChildren = nextProps.children
  // 判断当前虚拟 DOM 它的儿子是不是一个文本独生子
  const isDirectTextChild = shouldSetTextContent(type, nextProps)
  if (isDirectTextChild) {
    nextChildren = null
  }
  reconcileChildren(current, workInProgress, nextChildren)
  return workInProgress.child
}

/**
 * 根据新虚拟 DOM 构建新的 fiber 子链表
 * @param {*} current - 老fiber
 * @param {*} workInProgress - 新的fiber
 */
export function beginWork(current, workInProgress) {
  logger('beginWork', workInProgress)
  switch (workInProgress.tag) {
    case HostRoot:
      return updateHostRoot(current, workInProgress)
    case HostComponent:
      return updateHostComponent(current, workInProgress)
    case HostText:
      return null
  }
}
