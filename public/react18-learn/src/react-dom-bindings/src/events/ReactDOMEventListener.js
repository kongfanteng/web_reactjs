import {
  ContinuousEventPriority,
  DefaultEventPriority,
  DiscreteEventPriority,
  getCurrentUpdatePriority,
  setCurrentUpdatePriority,
} from 'react-reconciler/src/ReactEventPriorities'
import { getClosestInstanceFromNode } from '../client/ReactDOMComponentTree'
import { dispatchEventForPluginEventSystem } from './DOMPluginEventSystem'
import getEventTarget from './getEventTarget'

export function createEventListenerWrapperWithPriority(
  targetContainer,
  domEventName,
  eventSystemFlags
) {
  const listenerWrapper = dispatchDiscreteEvent
  return listenerWrapper.bind(
    null,
    domEventName,
    eventSystemFlags,
    targetContainer
  )
}

/**
 * 派发离散的事件的监听函数
 * @param {string} domEventName 事件名称 click
 * @param {number} eventSystemFlags 事件系统标志 阶段 0-冒泡 4-捕获
 * @param {*} container 事件监听目标容器 div#root
 * @param {*} nativeEvent 原生的事件
 */
function dispatchDiscreteEvent(
  domEventName,
  eventSystemFlags,
  container,
  nativeEvent
) {
  // 在你是点击按钮的时候，需要设置更新优先级
  // 先获取当前老的更新优先级
  const previousPriority = getCurrentUpdatePriority()
  try {
    // 把当前的更新优先级设置为离散事件优先级 1
    setCurrentUpdatePriority(DiscreteEventPriority)
    dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent)
  } finally {
    setCurrentUpdatePriority(previousPriority)
  }
}

/**
 * 此方法就是委托给容器的回调，当容器 #root 在捕获或者说冒泡阶段处理事件的时候会执行
 * @param {string} domEventName
 * @param {number} eventSystemFlags
 * @param {HTMLElement} targetContainer
 * @return {*} nativeEvent
 */
export function dispatchEvent(
  domEventName,
  eventSystemFlags,
  targetContainer,
  nativeEvent
) {
  // 获取事件源，它是一个真实 DOM
  const nativeEventTarget = getEventTarget(nativeEvent)
  const targetInst = getClosestInstanceFromNode(nativeEventTarget)
  dispatchEventForPluginEventSystem(
    domEventName, // click
    eventSystemFlags, // 0 4
    nativeEvent, // 原生事件
    targetInst, // 此真实 DOM 对应的 fiber
    targetContainer // 目标容器
  )
}
/**
 * description: 获取事件优先级
 * @param {string} domEventName 事件名称
 * @return {number} 事件优先级
 */
export function getEventPriority(domEventName) {
  switch (domEventName) {
    case 'click':
      return DiscreteEventPriority
    case 'drag':
      return ContinuousEventPriority
    default:
      return DefaultEventPriority
  }
}
