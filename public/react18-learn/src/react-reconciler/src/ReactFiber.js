import { NoFlags } from './ReactFiberFlags'
import {
  HostComponent,
  HostRoot,
  HostText,
  IndeterminateComponent,
} from './ReactWorkTags'
/**
 * @param {*} tag - fiber 的类型 函数组件0; 类组件 1; 原生组件 5; 根元素 3;
 * @param {*} pendingProps - 新属性，等待处理或者说生效的属性
 * @param {string} key - 唯一标识
 */
export function FiberNode(tag, pendingProps, key) {
  this.tag = tag
  this.key = key
  this.type = null // fiber类型，来自于虚拟 DOM 节点的 type - span div p
  // 每个虚拟 DOM => Fiber 节点 => 真实 DOM
  this.stateNode = null // 此 fiber 对应的真实 DOM 节点 h1 => 真实的 h1DOM

  this.return = null // 指向父节点
  this.child = null // 指向第一个子节点
  this.sibling = null // 指向弟弟

  // fiber 来处 - 通过虚拟 DOM 节点创建，虚拟 DOM 会提供 pendingProps 用来创建 fiber 节点的属性
  this.pendingProps = pendingProps // 等待生效的属性
  this.memoizedProps = null // 已经生效的属性

  // 每个 fiber 还会有自己的状态，每一种 fiber 状态存的类型是不一样的
  // 类组件对应的 fiber 存的就是类实例的状态, Hostroot 存的就是要渲染的元素
  this.memoizedstate = null
  // 每个 fiber 身上可能还有更新队列
  this.updateQueue = null
  // 副作用的标识，表示要针对此 fiber 节点进行何种操作
  this.flags = NoFlags
  // 子节点对应的副作用标识
  this.subtreeFlags = NoFlags
  //替身，轮替
  this.alternate = null
  this.index = 0
}
export function createFiber(tag, pendingProps, key) {
  return new FiberNode(tag, pendingProps, key)
}
export function createHostRootFiber() {
  return createFiber(HostRoot)
}

/**
 * 基于老的 fiber 和新的属性创建新的 fiber
 * @param {*} current - 老 fiber
 * @param {*} pendingProps - 新属性
 */
export function createWorkInProgress(current, pendingProps) {
  let workInProgress = current.alternate
  if (workInProgress === null) {
    workInProgress = createFiber(current.tag, pendingProps, current.key)
    workInProgress.type = current.type
    workInProgress.stateNode = current.stateNode
    workInProgress.alternate = current
    current.alternate = workInProgress
  } else {
    workInProgress.pendingProps = pendingProps
    workInProgress.type = current.type
    workInProgress.flags = NoFlags
    workInProgress.subtreeFlags = NoFlags
  }
  workInProgress.child = current.child
  workInProgress.memoizedProps = current.memoizedProps
  workInProgress.memoizedState = current.memoizedState
  workInProgress.updateQueue = current.updateQueue
  workInProgress.sibling = current.sibling
  workInProgress.index = current.index
  return workInProgress
}

function createFiberFromTypeAndProps(type, key, pendingProps) {
  let tag = IndeterminateComponent
  // 如果类型 type 是一字符串 span div ，说此此 Fiber 类型是一个原生组件
  if (typeof type === 'string') {
    tag = HostComponent
  }
  const fiber = createFiber(tag, pendingProps, key)
  fiber.type = type
  return fiber
}

export function createFiberFromText(content) {
  return createFiber(HostText, content, null)
}

/**
 * 根据虚拟 DOM 创建 Fiber 节点
 * @param {*} element
 */
export function createFiberFromElement(element) {
  const { type, key, props: pendingProps } = element
  return createFiberFromTypeAndProps(type, key, pendingProps)
}
