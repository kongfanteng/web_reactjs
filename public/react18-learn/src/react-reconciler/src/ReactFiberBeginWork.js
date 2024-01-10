import { shouldSetTextContent } from 'react-dom-bindings/src/client/ReactDOMHostConfig'
import { mountChildFibers, reconcileChildFibers } from './ReactChildFiber'
import { cloneUpdateQueue, processUpdateQueue } from './ReactFiberClassUpdateQueue'
import { renderWithHooks } from './ReactFiberHooks'
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
  IndeterminateComponent,
} from './ReactWorkTags'

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
// function updateHostRoot(current, workInProgress, renderLanes) {
//   const nextProps = workInProgress.pendingProps
//   cloneUpdateQueue(current, workInProgress)
//   //需要知道它的子虚拟DOM，知道它的儿子的虚拟DOM信息
//   processUpdateQueue(workInProgress, nextProps, renderLanes) //workInProgress.memoizedState={ element }
//   const nextState = workInProgress.memoizedState
//   //nextChildren就是新的子虚拟DOM
//   const nextChildren = nextState.element //h1
//   //根据新的虚拟DOM生成子fiber链表
//   reconcileChildren(current, workInProgress, nextChildren)
//   return workInProgress.child //{tag:5,type:'h1'}
// }
function updateHostRoot(current, workInProgress, renderLanes) {
  const nextProps = workInProgress.pendingProps
  cloneUpdateQueue(current, workInProgress)
  // 需要知道它的子虚拟 DOM，知道它的儿子的虚拟 DOM 信息
  processUpdateQueue(workInProgress, nextProps, renderLanes) // workInProgress.memoizedState={ element }
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
export function beginWork(current, workInProgress, renderLanes) {
  // logger(' '.repeat(indent.number) + 'beginWork', workInProgress)
  // indent.number += 2
  switch (workInProgress.tag) {
    // 因为在 React 里组件其实有两种，一种是函数组件，一种是类组件，但是它们都是都是函数
    case IndeterminateComponent:
      return mountIndeterminateComponent(
        current,
        workInProgress,
        workInProgress.type
      )
    case FunctionComponent: {
      const Component = workInProgress.type
      const nextProps = workInProgress.pendingProps
      return updateFunctionComponent(
        current,
        workInProgress,
        Component,
        nextProps
      )
    }
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderLanes)
    case HostComponent:
      return updateHostComponent(current, workInProgress)
    case HostText:
      return null
    default:
      return null
  }
}

/**
 * 挂载函数组件
 * @param {*} current - 老 fiber
 * @param {*} workInProgress 新的 fiber
 * @param {*} Component 组件类型，也就是函数组件的定义
 */
export function mountIndeterminateComponent(
  current,
  workInProgress,
  Component
) {
  const props = workInProgress.pendingProps
  const value = renderWithHooks(current, workInProgress, Component, props)
  workInProgress.tag = FunctionComponent
  reconcileChildren(current, workInProgress, value)
  return workInProgress.child
}

export function updateFunctionComponent(
  current,
  workInProgress,
  Component,
  props
) {
  const nextChildren = renderWithHooks(
    current,
    workInProgress,
    Component,
    props
  )
  reconcileChildren(current, workInProgress, nextChildren)
  return workInProgress.child
}
