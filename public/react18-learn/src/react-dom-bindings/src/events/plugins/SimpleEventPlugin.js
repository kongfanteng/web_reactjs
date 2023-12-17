import {
  registerSimpleEvents,
  topLevelEventsToReactNames,
} from '../DOMEventProperties'
import { accumulateSinglePhaseListeners } from '../DOMPluginEventSystem'
import { IS_CAPTURE_PHASE } from '../EventSystemFlags'
import { SyntheticMouseEvent } from '../SyntheticEvents'

/**
 * 回调函数添加到派发队列
 * @param {*} dispatchQueue - 派发队列，放置监听函数
 * @param {*} domEventName - DOM 事件名，click
 * @param {*} targetInst - 目标 fiber
 * @param {*} nativeEvent - 原生事件
 * @param {*} nativeEventTarget - 原生事件源
 * @param {*} eventSystemFlags - 事件系统标志：0-冒泡；4-捕获；
 * @param {*} targetContainer - 目标容器，div#root
 */
export function extractEvents(
  dispatchQueue,
  domEventName,
  targetInst,
  nativeEvent,
  nativeEventTarget,
  eventSystemFlags,
  targetContainer
) {
  //通过map映射查找对应的属性
  const reactName = topLevelEventsToReactNames.get(domEventName) //click=>onClick
  let SyntheticEventCtor // 合成事件的构建函数
  switch (domEventName) {
    case 'click':
      SyntheticEventCtor = SyntheticMouseEvent
      break
    default:
      break
  }
  const isCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0
  const listeners = accumulateSinglePhaseListeners(
    targetInst,
    reactName,
    nativeEvent.type,
    isCapturePhase
  )
  // 如果有要执行的监听函数的话 [onClickCapture,onclickCapture]=[ChildCapture,ParentCapture]
  if (listeners.length > 0) {
    // 合成事件实例
    const event = new SyntheticEventCtor(
      reactName,
      domEventName,
      null,
      nativeEvent,
      nativeEventTarget
    )
    dispatchQueue.push({
      event,
      listeners, // 监听函数数组
    })
  }
}

export { registerSimpleEvents as registerEvents }
