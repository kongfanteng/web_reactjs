import {
  appendInitialChild,
  createInstance,
  createTextInstance,
  finalizeInitialChildren,
  prepareUpdate,
} from 'react-dom-bindings/src/client/ReactDOMHostConfig'
import logger, { indent } from 'shared/logger'
import { NoFlags, Update } from './ReactFiberFlags'
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from './ReactWorkTags'

/**
 * 把当前的完成的 fiber 所有的子节点对应的真实 DOM 都挂载到自己父 parent 真实 DOM 节点上
 * @param {*} parent - 当前完成的 fiber 真实的 DOM 节点
 * @param {*} workInProgress - 完成的 fiber
 */
function appendAllChildren(parent, workInProgress) {
  let node = workInProgress.child
  while (node) {
    // 如果子节点类型是一个原生节点或者是一个文件节点
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node.stateNode)
      // 如果第一个儿子不是一个原生节点, 说明它可能是一个函数组件
    } else if (node.child !== null) {
      node = node.child
      continue
    }
    if (node === workInProgress) {
      return
    }
    // 如果当前的节点没有弟弟
    while (node.sibling === null) {
      if (node.return === null || node.return === workInProgress) {
        return
      }
      // 回到父节点
      node = node.return
    }
    node = node.sibling
  }
}

/**
 * 完成一个 fiber 节点
 * @param {*} current - 老 fiber
 * @param {*} workInProgress - 新的构建的 fiber
 */
export function completeWork(current, workInProgress) {
  // indent.number -= 2
  // logger(' '.repeat(indent.number) + 'completeWork', workInProgress)
  const newProps = workInProgress.pendingProps
  switch (workInProgress.tag) {
    case HostRoot:
      bubbleProperties(workInProgress)
      break
    // 如果完成的是原生节点的话
    case HostComponent:
      // 创建真实的 DOM 节点
      const { type } = workInProgress
      if (current !== null && workInProgress.stateNode !== null) {
        updateHostComponent(current, workInProgress, type, newProps)
      } else {
        const instance = createInstance(type, newProps, workInProgress)
        // 把自己所有的儿子都添加到自己的身上
        appendAllChildren(instance, workInProgress)
        workInProgress.stateNode = instance
        finalizeInitialChildren(instance, type, newProps)
      }
      bubbleProperties(workInProgress)
      break
    case FunctionComponent:
      bubbleProperties(workInProgress)
      break
    case HostText:
      // 如果完成的 fiber 是文本节点, 那就创建真实的文本节点
      const newText = newProps
      workInProgress.stateNode = createTextInstance(newText)
      // 向上冒泡属性
      bubbleProperties(workInProgress)
  }
}

function bubbleProperties(completedWork) {
  let subtreeFlags = NoFlags
  // 遍历当前 fiber 的所有子节点, 把所有的子节的副作用, 以及子节点的子节点的副作用全部合并
  let child = completedWork.child
  while (child !== null) {
    subtreeFlags |= child.subtreeFlags
    subtreeFlags |= child.flags
    child = child.sibling
  }
  completedWork.subtreeFlags = subtreeFlags
}
/**
 * description: 节点更新函数
 * @param {*} current - 老 fiber
 * @param {*} workInProgress - 新 fiber
 * @param {*} type - 类型
 * @param {*} newProps - 新属性 props
 */
function updateHostComponent(current, workInProgress, type, newProps) {
  const oldProps = current.memoizedProps // 老的属性
  const instance = workInProgress.stateNode // 老的 DOM 节点
  // 比较新老属性，收集属性的差异
  const updatePayload = prepareUpdate(instance, type, oldProps, newProps)
  // console.log('updatePayload:', updatePayload)
  // 让原生组件的新 fiber 更新队列等于 []
  workInProgress.updateQueue = updatePayload
  if (updatePayload) {
    markUpdate(workInProgress)
  }
}
/**
 * description: 更新阶段标记函数
 * @param {*} workInProgress - 新 fiber
 */
function markUpdate(workInProgress) {
  workInProgress.flags |= Update
}
