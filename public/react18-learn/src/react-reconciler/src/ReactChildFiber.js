import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import isArray from 'shared/isArray'
import {
  createFiberFromElement,
  createFiberFromText,
  createWorkInProgress,
} from './ReactFiber'
import { ChildDeletion, Placement } from './ReactFiberFlags'

/**
 * @param {*} shouldTrackSideEffects - 是否跟踪副作用
 */
function createChildReconciler(shouldTrackSideEffects) {
  function deleteChild(returnFiber, childToDelete) {
    if (!shouldTrackSideEffects) return
    const deletions = returnFiber.deletions
    if (deletions === null) {
      returnFiber.deletions = [childToDelete]
      returnFiber.flags |= ChildDeletion
    } else {
      returnFiber.deletions.push(childToDelete)
    }
  }
  /**
   * description: 基于老 fiber 创建新 fiber
   * @param {*} fiber - 老 fiber
   * @param {*} pendingProps - 新属性 props
   */
  function useFiber(fiber, pendingProps) {
    const clone = createWorkInProgress(fiber, pendingProps)
    clone.index = 0
    clone.sibling = null
    return clone
  }
  /**
   * description: 第一个子 fiber 获取
   * @param {*} returnFiber
   * @param {*} currentFirstFiber
   * @param {*} element
   */
  function reconcileSingleElement(returnFiber, currentFirstFiber, element) {
    // 新的虚拟 DOM 的 key，也就是唯一标准
    const key = element.key // null
    let child = currentFirstFiber // 老 FunctionComponent 节点对应的 fiber

    while (child !== null) {
      // 老 fiber 的 key 和新的 key 一样，表示可以复用
      if (child.key === key) {
        // 老 fiber 的 type 和新的 type 一样，表示可以复用
        if (child.type === element.type) {
          deleteRemainingChildren(returnFiber, child.sibling)
          // 老 fiber 的 key&type 和新的一样，表示可以复用
          const existing = useFiber(child, element.props)
          existing.return = returnFiber
          return existing
        } else {
          // 如果找到一key一样老fiber,但是类型不一样，不能此老fiber,把剩下的全部删除
          deleteRemainingChildren(returnFiber, child)
        }
      } else {
        deleteChild(returnFiber, child)
      }
      child = child.sibling
    }
    // 初次挂载，老节点 currentFirstFiber 是没有的，可以直接根据虚拟 DOM 创建新的 Fiber 节点
    const created = createFiberFromElement(element)
    created.return = returnFiber
    return created
  }

  /**
   * 对从 currentFirstChild 之后的所有 fiber 节点删除函数
   */
  function deleteRemainingChildren(returnFiber, currentFirstChild) {
    if (!shouldTrackSideEffects) return
    let childToDelete = currentFirstChild
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete)
      childToDelete = childToDelete.sibling
    }
    return null
  }

  function placeChild(newFiber, lastPlacedIndex, newIdx) {
    // 指定新的fiber在新的挂载索引
    newFiber.index = newIdx
    // 如果不需要跟踪副作用
    if (!shouldTrackSideEffects) {
      return lastPlacedIndex
    }
    // 获取它的老fiber
    const current = newFiber.alternate
    // 如果有，说明这是一个更新的节点，有老的真实DOM
    if (current !== null) {
      const oldIndex = current.index
      // 如果找到的老 fiber 的索引比 lastPlacedIndex 小，说明老的 fiber 对应的 DOM 节点需要移动
      if (oldIndex < lastPlacedIndex) {
        newFiber.flags |= Placement
        return lastPlacedIndex
      } else {
        return oldIndex
      }
    } else {
      // 如果没有，说明这是一个新的节点，需要插入
      newFiber.flags |= Placement
    }
  }

  /**
   * 设置副作用
   * @param {*} newFiber
   */
  function placeSingleChild(newFiber) {
    // 说明要添加副作用
    if (shouldTrackSideEffects && newFiber.alternate === null) {
      // 要在最后的提交阶段插入此节点，React 渲染分成渲染(创建Fiber树)和提交(更新真实DOM)二个阶段
      newFiber.flags |= Placement
    }
    return newFiber
  }

  /**
   * 比较子 Fibers DOM-PIFF 就是用老的子 fiber 链表和新的虚拟 DOM 进行比较的过程
   * @param returnFiber - 新的父 Fiber
   * @param currentFirstFiber - 老 fiber 第一个子 fiber，current 一般来说指的是老 fiber
   * @param newChild - 新的子虚拟 DOM h1 虚拟 DOM
   */
  function reconcileChildFibers(returnFiber, currentFirstFiber, newChild) {
    // 现在暂时只考虑新的节点只有一个的情况
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
            reconcileSingleElement(returnFiber, currentFirstFiber, newChild)
          )
        default:
          break
      }
    }
    // newChild [hello文本节点，span虚拟DOM元素]
    if (isArray(newChild)) {
      return reconcileChildrenArray(returnFiber, currentFirstFiber, newChild)
    }
    return null
  }
  function createChild(returnFiber, newChild) {
    if (
      (typeof newChild == 'string' && newChild !== '') ||
      typeof newChild === 'number'
    ) {
      const created = createFiberFromText(`${newChild}`)
      created.return = returnFiber
      return created
    }
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          const created = createFiberFromElement(newChild)
          created.return = returnFiber
          return created
        default:
          break
      }
    }
    return null
  }

  function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren) {
    let resultingFirstChild = null // 返回的第一个新儿子
    let previousNewFiber = null //上一个的一个新的 fiber
    let newIdx = 0
    let oldFiber = currentFirstChild // 第一个老fiber
    let nextOldFiber = null // 下一个老fiber
    let lastPlacedIndex = 0 // 上一个不要移动的节点索引
    // 开始第一轮循环 如果老fiber有值，新的虚拟DOM也有值
    for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
      //先暂下一个老fiber
      nextOldFiber = oldFiber.sibling
      //试图更新或者试图复用老的
      const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx])
      if (newFiber === null) {
        break
      }
      // Q: 判断是否需要追踪副作用原因？提升性能，避免添加不必要的副作用
      if (shouldTrackSideEffects) {
        // 如果有老fiber,但是新的fiber并没有成功复用老fiber和老的真实DOM，那就删除老fiber,在提交阶段会删除真实DOM
        if (oldFiber && newFiber.alternate === null) {
          deleteChild(returnFiber, oldFiber)
        }
      }
      // 指定新的fiber存放位置，并且给lastPlacedIndex赋值
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx)
      if (previousNewFiber === null) {
        resultingFirstChild = newFiber // li(A).sibling = p(B).sibling = li(C)
      } else {
        previousNewFiber.sibling = newFiber
      }
      previousNewFiber = newFiber
      // Q: oldFiber = oldFiber.sibling 不这样写的原因？为了安全，sibling 使用较多，防止开发者修改老 fiber 的 sibling
      oldFiber = nextOldFiber
    }
    // 新的虚拟 DOM 已经循环完毕，3个节点变为 2 个节点
    if (newIdx === newChildren.length) {
      // 删除剩下的老 fiber
      deleteRemainingChildren(returnFiber, oldFiber)
      return resultingFirstChild
    }
    if (oldFiber === null) {
      // 如果老的 fiber 已经没有了，新的虚拟 DOM 还有，插入新节点的逻辑
      for (; newIdx < newChildren.length; newIdx++) {
        const newFiber = createChild(returnFiber, newChildren[newIdx])
        if (newFiber === null) continue
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx)
        //  如果 previousNewFiber 为 null，说明这是第一个 fiber
        if (previousNewFiber === null) {
          resultingFirstChild = newFiber // 这个 newFiber 就是大儿子
        } else {
          // 否则说明不是大儿子，就把这个 newFiber 添加上一个子节点后面
          previousNewFiber.sibling = newFiber
        }
        // 让 newFiber 成为最后一个或者说上一个子 fiber
        previousNewFiber = newFiber
      }
    }

    const existingChildren = mapRemainingChildren(returnFiber, oldFiber)
    for (; newIdx < newChildren.length; newIdx++) {
      const newFiber = updateFromMap(
        existingChildren,
        returnFiber,
        newIdx,
        newChildren[newIdx]
      )
      if (newFiber !== null) {
        if (shouldTrackSideEffects) {
          // 如果要跟踪副作用，并且有老 fiber
          if (newFiber.alternate !== null) {
            existingChildren.delete(
              newFiber.key === null ? newIdx : newFiber.key
            )
          }
        }
        // 指定新的fiber存放位置 ，并且给lastPlacedIndex赋值
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx)
        if (previousNewFiber == null) {
          resultingFirstChild = newFiber // //这个newFiber就是大儿子
        } else {
          // 否则说明不是大儿子，就把这个newFiber添加上一个子节点后面
          previousNewFiber.sibling = newFiber
        }
        // 让newFiber成为最后一个或者说上一个子fiber
        previousNewFiber = newFiber
      }
    }
    if (shouldTrackSideEffects) {
      existingChildren.forEach((child) => deleteChild(returnFiber, child))
    }
    return resultingFirstChild
  }

  function updateTextNode(returnFiber, current, textContent) {
    if (current === null || current.tag !== HostText) {
      const created = createFiberFromText(textContent)
      created.return = returnFiber
      return created
    } else {
      const existing = useFiber(current, textContent)
      existing.return = returnFiber
      return existing
    }
  }
  function updateFromMap(existingChildren, returnFiber, newIdx, newChild) {
    if (
      (typeof newChild === 'string' && newChild !== '') ||
      typeof newChild === 'number'
    ) {
      const matchedFiber = existingChildren.get(newIdx) || null
      return updateTextNode(returnFiber, matchedFiber, '' + newChild)
    }
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          const matchedFiber =
            existingChildren.get(
              newChild.key === null ? newIdx : newChild.key
            ) || null
          return updateElement(returnFiber, matchedFiber, newChild)
        }
      }
    }
  }
  function mapRemainingChildren(returnFiber, currentFirstChild) {
    const existingChildren = new Map()
    let existingChild = currentFirstChild
    while (existingChild != null) {
      // 如果有key用key,如果没有key使用索引
      if (existingChild.key !== null) {
        existingChildren.set(existingChild.key, existingChild)
      } else {
        existingChildren.set(existingChild.index, existingChild)
      }
      existingChild = existingChild.sibling
    }
    return existingChildren
  }
  function updateElement(returnFiber, current, element) {
    const elementType = element.type
    if (current !== null) {
      // 判断是否类型一样，则表示key和type都一样，可以复用老的fiber和真实DOM
      if (current.type === elementType) {
        const existing = useFiber(current, element.props)
        existing.return = returnFiber
        return existing
      }
    }
    const created = createFiberFromElement(element)
    created.return = returnFiber
    return created
  }

  function updateSlot(returnFiber, oldFiber, newChild) {
    const key = oldFiber !== null ? oldFiber.key : null
    if (newChild !== null && typeof newChild === 'object') {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          //如果key一样，进入更新元素的逻辑
          if (newChild.key === key) {
            return updateElement(returnFiber, oldFiber, newChild)
          }
        }
        default:
          return null
      }
    }
    return null
  }
  return reconcileChildFibers
}

// 有老 fiber 更新的时候用这个
export const reconcileChildFibers = createChildReconciler(true)

//如果没有老 fiber, 初次挂载的时候用这个
export const mountChildFibers = createChildReconciler(false)
