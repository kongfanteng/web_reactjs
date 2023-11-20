import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import isArray from 'shared/isArray'
import { createFiberFromElement, createFiberFromText } from './ReactFiber'
import { Placement } from './ReactFiberFlags'

/**
 * @param {*} shouldTrackSideEffects - 是否跟踪副作用
 */
function createChildReconciler(shouldTrackSideEffects) {
  function reconcileSingleElement(returnFiber, currentFirstFiber, element) {
    // 初次挂载，老节点 currentFirstFiber 是没有的，可以直接根据虚拟 DOM 创建新的 Fiber 节点
    const created = createFiberFromElement(element)
    created.return = returnFiber
    return created
  }

  function placeChild(newFiber, newIdx) {
    newFiber.index = newIdx
    if (shouldTrackSideEffects) {
      // 如果一个 fiber 它的 flags 上有Placement, 说明此节点需要创建真实 DOM 并且插入到父容器中
      // 如果父 fiber 节点是初次挂载， shouldTrackSideEffects === false, 不需要添加 flags
      // 这种情况下会在完成阶段把所有的子节点全部添加到自己身上
      newFiber.flags |= Placement
    }
  }

  /**
   * 设置副作用
   * @param {*} newFiber
   */
  function placeSingleChild(newFiber) {
    // 说明要添加副作用
    if (shouldTrackSideEffects) {
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

  function reconcileChildrenArray(returnFiber, currentFirstFiber, newChildren) {
    let resultingFirstChild = null // 返回的第一个新儿子
    let previousNewFiber = null //上一个的一个新的 fiber
    let newIdx = 0
    for (; newIdx < newChildren.length; newIdx++) {
      const newFiber = createChild(returnFiber, newChildren[newIdx])
      if (newFiber === null) continue
      placeChild(newFiber, newIdx)
      //  如果 previousNewFiber 为 null，说明这是第一个 fiber
      if (previousNewFiber === null) {
        resultingFirstChild = newFiber // 这个 newFiber 就是大儿子
      } else {
        // 否则说明不是大儿子，就把这个 newFiber 添加上一个子节点后面
        previousNewFiber.sibling = newFiber
      }
      previousNewFiber = newFiber
    }
    return resultingFirstChild
  }
  return reconcileChildFibers
}

// 有老 fiber 更新的时候用这个
export const reconcileChildFibers = createChildReconciler(true)

//如果没有老 fiber, 初次挂载的时候用这个
export const mountChildFibers = createChildReconciler(false)
