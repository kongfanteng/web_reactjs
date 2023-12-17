import { HostComponent } from 'react-reconciler/src/ReactWorkTags'
import {
  addEventBubbleListener,
  addEventCaptureListener,
} from './EventListener'
import { allNativeEvents } from './EventRegistry'
import { IS_CAPTURE_PHASE } from './EventSystemFlags'
import { createEventListenerWrapperWithPriority } from './ReactDOMEventListener'
import getEventTarget from './getEventTarget'
import getListener from './getListener'
import * as SimpleEventPlugin from './plugins/SimpleEventPlugin'
SimpleEventPlugin.registerEvents()

const listeningMarker = '_reactListening' + Math.random().toString(36).slice(2)
export function listenToAllSupportedEvents(rootContainerElement) {
  if (!rootContainerElement[listeningMarker]) {
    rootContainerElement[listeningMarker] = true
    // 遍历所有的原生的事件比如 click，进行监听
    allNativeEvents.forEach((domEventName) => {
      listenToNativeEvent(domEventName, true, rootContainerElement)
      listenToNativeEvent(domEventName, false, rootContainerElement)
    })
  }
}

/**
 * description: 注册原生事件
 * @param {*} domEventName 原生事件名 click
 * @param {*} isCapturePhaseListener 是否捕获阶段
 * @param {*} target 目标 DOM 节点 div#root 容器节点
 */
export function listenToNativeEvent(
  domEventName,
  isCapturePhaseListener,
  target
) {
  let eventSystemFlags = 0 // 默认是 0 指的是冒泡，4 是捕获
  if (isCapturePhaseListener) {
    eventSystemFlags |= IS_CAPTURE_PHASE
  }
  addTrappedEventListener(
    target,
    domEventName,
    eventSystemFlags,
    isCapturePhaseListener
  )
}

function addTrappedEventListener(
  target,
  domEventName,
  eventSystemFlags,
  isCapturePhaseListener
) {
  const listener = createEventListenerWrapperWithPriority(
    target,
    domEventName,
    eventSystemFlags
  )
  if (isCapturePhaseListener) {
    addEventCaptureListener(target, domEventName, listener)
  } else {
    addEventBubbleListener(target, domEventName, listener)
  }
}
export function dispatchEventForPluginEventSystem(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst,
  targetContainer
) {
  dispatchEventForPlugins(
    domEventName,
    eventSystemFlags,
    nativeEvent,
    targetInst,
    targetContainer
  )
}
/**
 * 自下而上的存储事件
 */
function dispatchEventForPlugins(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst,
  targetContainer
) {
  const nativeEventTarget = getEventTarget(nativeEvent)
  // 派发事件的数组
  const dispatchQueue = []
  extractEvents(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer
  )
  processDispatchQueue(dispatchQueue, eventSystemFlags)
}

function processDispatchQueue(dispatchQueue, eventSystemFlags) {
  // 判断是否在捕获阶段
  const isCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0
  for (let i = 0; i < dispatchQueue.length; i++) {
    const { event, listeners } = dispatchQueue[i]
    processDispatchQqueueItemsInOrder(event, listeners, isCapturePhase)
  }
}

function processDispatchQqueueItemsInOrder(
  event,
  dispathchListeners,
  isCapturePhase
) {
  if (isCapturePhase) {
    // dispathchListeners[子, 父]
    for (let i = dispathchListeners.length - 1; i >= 0; i--) {
      const { listener, currentTarget } = dispathchListeners[i]
      if (event.isPropagationStopped()) {
        return
      }
      executeDispatch(event, listener, currentTarget)
      // listener(event)
    }
  } else {
    for (let i = 0; i < dispathchListeners.length; i++) {
      const { listener, currentTarget } = dispathchListeners[i]
      if (event.isPropagationStopped()) {
        return
      }
      executeDispatch(event, listener, currentTarget)
    }
  }
}

function executeDispatch(event, listener, currentTarget) {
  // 合成事件实例 currentTarget 是在不断的变化的
  // event nativeEventTarget 它的是原始的事件源，是永远不变的
  // event currentTarget 当前的事件源，它是会随着事件回调的执行不断变化的
  event.currentTarget = currentTarget
  listener(event)
}

function extractEvents(
  dispatchQueue,
  domEventName,
  targetInst,
  nativeEvent,
  nativeEventTarget,
  eventSystemFlags,
  targetContainer
) {
  SimpleEventPlugin.extractEvents(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer
  )
}

export function accumulateSinglePhaseListeners(
  targetFiber,
  reactName,
  nativeEventType,
  isCapturePhase
) {
  const captureName = reactName + 'Capture'
  const reactEventName = isCapturePhase ? captureName : reactName
  const listeners = []
  let instance = targetFiber
  while (instance !== null) {
    const { stateNode, tag } = instance
    if (tag === HostComponent && stateNode !== null) {
      const listener = getListener(instance, reactEventName)
      if (listener) {
        listeners.push(createDispatchListener(instance, listener, stateNode)) // 创建 dispatch listener
      }
    }
    instance = instance.return
  }
  return listeners
}
/**
 * description:
 * @param {*} instance
 * @param {*} listener
 * @param {*} currentTarget
 */
function createDispatchListener(instance, listener, currentTarget) {
  return { instance, listener, currentTarget }
}
