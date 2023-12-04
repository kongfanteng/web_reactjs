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
  console.log('dispatchQueue', dispatchQueue)
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
        listeners.push(listener)
      }
    }
    instance = instance.return
  }
  return listeners
}
