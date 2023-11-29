import {
  appendChild,
  insertBefore,
} from 'react-dom-bindings/src/client/ReactDOMHostConfig'
import { MutationMask, Placement } from './ReactFiberFlags'
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from './ReactWorkTags'

/**
 * 遍历 fiber 树, 执行 fiber 上的副作用
 * @param {*} finishedWork - fiber 节点
 * @param {*} root - 根节点
 */
export function commitMutationEffectsOnFiber(finishedWork, root) {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case HostRoot:
    case HostComponent:
    case HostText: {
      // 先遍历它们的子节点，处理它们的子节点上的副作用
      recursivelyTraverseMutationEffects(root, finishedWork)
      // 再处理自己身上的副作用
      commitReconciliationEffects(finishedWork)
      break
    }
    default:
      break
  }
}

function recursivelyTraverseMutationEffects(root, parentFiber) {
  if (parentFiber.subtreeFlags & MutationMask) {
    let { child } = parentFiber
    while (child !== null) {
      commitMutationEffectsOnFiber(child, root)
      child = child.sibling
    }
  }
}

function commitReconciliationEffects(finishedWork) {
  const { flags } = finishedWork
  // 如果此 fiber 要执行插入操作的话
  if (flags & Placement) {
    // 进行插入操作，也就是把此 fiber 对应的真实 DOM 节点添加到父真实 DOM 节点上
    commitPlacement(finishedWork)
    //把 flags 里的 Placement 删除
    finishedWork.flags & ~Placement
  }
}
/**
 * 把此 fiber 的真实 DOM 插入到父 DOM 里
 * @param {*} finishedWork
 */
function commitPlacement(finishedWork) {
  const parentFiber = getHostParentFiber(finishedWork)
  switch (parentFiber.tag) {
    case HostRoot: {
      const parent = parentFiber.stateNode.containerInfo
      const before = getHostSibling(finishedWork) // 获取最近的弟弟真实 DOM 节点
      insertOrAppendPlacementNode(finishedWork, before, parent)
      break
    }
    case HostComponent: {
      const parent = parentFiber.stateNode
      const before = getHostSibling(finishedWork)
      insertOrAppendPlacementNode(finishedWork, before, parent)
      break
    }
    default:
      break
  }
}

function isHostParent(fiber) {
  return fiber.tag === HostComponent || fiber.tag === HostRoot
}
function getHostParentFiber(fiber) {
  let parent = fiber.return
  while (parent !== null) {
    if (isHostParent(parent)) {
      return parent
    }
    parent = parent.return
  }
}

/**
 * 把子节点对应的真实 DOM 插入到父节点 DOM 中
 * @param {*} node - 将要插入的 fiber 节点
 * @param {*} parent - 父真实 DOM 节点
 */
function insertNode(node, parent) {
  const { tag } = node
  // 判断此 fiber 对应的节点是不是真实 DOM 节点
  const isHost = tag === HostComponent || tag === HostText
  // 如果是的话直接插入
  if (isHost) {
    const { stateNode } = node
    appendChild(parent, stateNode)
  } else {
    // 如果 node 不是真实的 DOM 节点，获取它的大儿子
    const { child } = node
    if (child !== null) {
      // 把大儿子添加到父亲 DOM 节点里面去
      insertNode(child, parent)
      let { sibling } = child
      while (sibling !== null) {
        insertNode(sibling, parent)
        sibling = sibling.sibling
      }
    }
  }
}
/**
 * 把子节点对应的真实 DOM 插入到父节点 DOM 中
 * @param {*} node - 将要插入的 fiber 节点
 * @param {*} before
 * @param {*} parent - 父真实 DOM 节点
 */
function insertOrAppendPlacementNode(node, before, parent) {
  const { tag } = node
  // 判断此 fiber 对应的节点是不是真实 DOM 节点
  const isHost = tag === HostComponent || tag == HostText
  // 如果是的话直接插入
  if (isHost) {
    const { stateNode } = node
    if (before) {
      insertBefore(parent, stateNode, before)
    } else {
      appendChild(parent, stateNode)
    }
  } else {
    // 如果 node 不是真实的 DOM 节点，获取它的大儿子
    const { child } = node
    if (child !== null) {
      // 把大儿子添加到父亲 DOM 节点里面去
      insertOrAppendPlacementNode(child, before, parent)
      let { sibling } = child
      while (sibling !== null) {
        insertOrAppendPlacementNode(sibling, before, parent)
        sibling = sibling.sibling
      }
    }
  }
}

/**
 * 找到要插入的锚点
 * 找到可以插在它的前面的那个 fiber 对应的真实 DOM
 * @param {*} fiber
 */
function getHostSibling(fiber) {
  let node = fiber
  siblings: while (true) {
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        return null
      }
      node = node.return
    }
    node = node.sibling
    // 如果弟弟不是原生节点也不是文本节点
    while (node.tag !== HostComponent && node.tag !== HostText) {
      // 如果此节点是一个将要插入的新的节点，找它的弟弟
      if (node.flags & Placement) {
        continue siblings
      } else {
        node = node.child
      }
    }
    if (!(node.flags & Placement)) {
      return node.stateNode
    }
  }
}
