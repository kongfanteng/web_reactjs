import {
  appendChild,
  insertBefore,
  commitUpdate,
  removeChild,
} from 'react-dom-bindings/src/client/ReactDOMHostConfig'
import {
  LayoutMask,
  MutationMask,
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
import {
  HasEffect as HookHasEffect,
  Passive as HookPassive,
  Layout as HookLayout,
} from './ReactHookEffectTags'

let hostParent = null

function recursivelyTraverseDeletionEffects(
  finishedRoot,
  nearestMountedAncestor,
  parent
) {
  let child = parent.child
  while (child !== null) {
    commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, child)
    child = child.sibling
  }
}

function commitDeletionEffectsOnFiber(
  finishedRoot,
  nearestMountedAncestor,
  deletedFiber
) {
  switch (deletedFiber.tag) {
    case HostComponent:
    case HostText: {
      // 当要删除一个节点时，先删除其子节点
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      )
      // 删除自身
      if (hostParent !== null) {
        removeChild(hostParent, deletedFiber.stateNode)
      }
      break
    }
    default:
      break
  }
}

/**
 * description: 副作用提交删除
 * @param {*} root 根节点
 * @param {*} returnFiber 父fiber
 * @param {*} deletedFiber  删除的fiber
 */
function commitDeletionEffects(root, returnFiber, deletedFiber) {
  let parent = returnFiber
  //一直向上找，找到真实的DOM节点为此
  findParent: while (parent !== null) {
    switch (parent.tag) {
      case HostComponent: {
        hostParent = parent.stateNode
        break findParent
      }
      case HostRoot: {
        hostParent = parent.stateNode.containerInfo
        break findParent
      }
    }
    parent = parent.return
  }
  commitDeletionEffectsOnFiber(root, returnFiber, deletedFiber)
  hostParent = null
}

/**
 * 遍历 fiber 树, 执行 fiber 上的副作用
 * @param {*} finishedWork - fiber 节点
 * @param {*} root - 根节点
 */
export function commitMutationEffectsOnFiber(finishedWork, root) {
  const current = finishedWork.alternate
  const { flags } = finishedWork
  switch (finishedWork.tag) {
    case FunctionComponent: {
      // 先遍历它们的子节点，处理它们的子节点上的副作用
      recursivelyTraverseMutationEffects(root, finishedWork)
      // 再处理自己身上的副作用
      commitReconciliationEffects(finishedWork)
      if (flags & Update) {
        commitHookEffectListUnmount(HookHasEffect | HookLayout, finishedWork)
      }
      break
    }
    case HostRoot:
    case HostText: {
      // 先遍历它们的子节点，处理它们的子节点上的副作用
      recursivelyTraverseMutationEffects(root, finishedWork)
      // 再处理自己身上的副作用
      commitReconciliationEffects(finishedWork)
      break
    }
    case HostComponent:
      // 先遍历它们的子节点，处理它们的子节点上的副作用
      recursivelyTraverseMutationEffects(root, finishedWork)
      // 再处理自己身上的副作用
      commitReconciliationEffects(finishedWork)
      // 处理 DOM 更新
      if (flags & Update) {
        // 获取真实 DOM
        const instance = finishedWork.stateNode
        // 更新真实 DOM
        if (instance !== null) {
          const newProps = finishedWork.memoizedProps
          const oldProps = current !== null ? current.memoizedProps : newProps
          const type = finishedWork.type
          const updatePayload = finishedWork.updateQueue
          finishedWork.updateQueue = null
          if (updatePayload) {
            commitUpdate(
              instance,
              updatePayload,
              type,
              oldProps,
              newProps,
              finishedWork
            )
          }
        }
      }
      break
    default:
      break
  }
}
/**
 * description: 递归遍历处理副作用函数
 * @param {*} root 根节点
 * @param {*} parentFiber 父 fiber
 */
function recursivelyTraverseMutationEffects(root, parentFiber) {
  const deletions = parentFiber.deletions
  if (deletions !== null) {
    for (let i = 0; i < deletions.length; i++) {
      const childToDelete = deletions[i]
      commitDeletionEffects(root, parentFiber, childToDelete)
    }
  }
  // 再去处理剩下的子节点
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

export function commitPassiveMountEffects(root, finishedWork) {
  // commitPassiveMountEffects ->
  // commitPassiveMountOnFiber ->
  // commitHookPassiveMountEffects ->
  // commitHookEffectListMount ->
  commitPassiveMountOnFiber(root, finishedWork)
}

function commitPassiveMountOnFiber(finishedRoot, finishedWork) {
  const flags = finishedWork.flags
  switch (finishedWork.tag) {
    case HostRoot: {
      recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork)
      break
    }
    case FunctionComponent: {
      recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork)
      if (flags & Passive) {
        commitHookPassiveMountEffects(finishedWork, HookHasEffect | HookPassive)
      }
      break
    }
  }
}

function commitHookPassiveMountEffects(finishedWork, hookFlags) {
  commitHookEffectListMount(hookFlags, finishedWork)
}
function commitHookEffectListMount(flags, finishedWork) {
  const updateQueue = finishedWork.updateQueue
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null
  if (lastEffect !== null) {
    // 获取第一个 effect
    const firstEffect = lastEffect.next
    let effect = firstEffect
    do {
      // 如果次 effect 类型和传入的相同，都是 9 HookHasEffect | PassiveEffect
      if ((effect.tag & flags) === flags) {
        const create = effect.create
        effect.destroy = create()
      }
      effect = effect.next
    } while (effect !== firstEffect)
  }
}
function recursivelyTraversePassiveMountEffects(root, parentFiber) {
  if (parentFiber.subtreeFlags & Passive) {
    let child = parentFiber.child
    while (child !== null) {
      commitPassiveMountOnFiber(root, child)
      child = child.sibling
    }
  }
}

export function commitPassiveUnmountEffects(finishedWork) {
  // commitPassiveUnmountEffects ->
  // commitPassiveUnmountOnFiber ->
  // commitHookPassiveUnmountEffects ->
  // commitHookEffectListUnmount ->
  commitPassiveUnmountOnFiber(finishedWork)
}

function commitPassiveUnmountOnFiber(finishedWork) {
  const flags = finishedWork.flags
  switch (finishedWork.tag) {
    case HostRoot: {
      recursivelyTraversePassiveUnmountEffects(finishedWork)
      break
    }
    case FunctionComponent: {
      recursivelyTraversePassiveUnmountEffects(finishedWork)
      if (flags & Passive) {
        //1024
        commitHookPassiveUnmountEffects(
          finishedWork,
          HookHasEffect | HookPassive
        )
      }
      break
    }
  }
}

function commitHookPassiveUnmountEffects(finishedWork, hookFlags) {
  commitHookEffectListUnmount(hookFlags, finishedWork)
}

function commitHookEffectListUnmount(flags, finishedWork) {
  const updateQueue = finishedWork.updateQueue
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null
  if (lastEffect !== null) {
    // 获取第一个 effect
    const firstEffect = lastEffect.next
    let effect = firstEffect
    do {
      // 如果次 effect 类型和传入的相同，都是 9 HookHasEffect | PassiveEffect
      if ((effect.tag & flags) === flags) {
        const destroy = effect.destroy
        if (destroy !== undefined) {
          destroy()
        }
      }
      effect = effect.next
    } while (effect !== firstEffect)
  }
}

function recursivelyTraversePassiveUnmountEffects(parentFiber) {
  if (parentFiber.subtreeFlags & Passive) {
    let child = parentFiber.child
    while (child !== null) {
      commitPassiveUnmountOnFiber(child)
      child = child.sibling
    }
  }
}

export function commitLayoutEffects(finishedWork, root) {
  //老的根fiber
  const current = finishedWork.alternate
  commitLayoutEffectOnFiber(root, current, finishedWork)
}

function commitLayoutEffectOnFiber(finishedRoot, current, finishedWork) {
  const flags = finishedWork.flags
  switch (finishedWork.tag) {
    case HostRoot:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork)
      break
    case FunctionComponent:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork)
      if (flags & LayoutMask) {
        // Layout=Update=4
        commitHookLayoutEffects(finishedWork, HookHasEffect | HookLayout)
      }
      break
  }
}

function commitHookLayoutEffects(finishedWork, hookFlags) {
  commitHookEffectListMount(hookFlags, finishedWork)
}

function recursivelyTraverseLayoutEffects(root, parentFiber) {
  if (parentFiber.subtreeFlags & LayoutMask) {
    let child = parentFiber.child
    while (child !== null) {
      const current = child.alternate
      commitLayoutEffectOnFiber(root, current, child)
      child = child.sibling
    }
  }
}
