import assign from 'shared/assign'

function functionThatReturnsTrue() {
  return true
}
function functionThatReturnsFalse() {
  return false
}
const MouseEventInterface = {
  clickX: 0,
  clickY: 0,
}

function createSyntheticEvent(inter) {
  /**
   * 合成事件基类
   * @param {*} reactName - React 属性名 onClick
   * @param {*} reactEventType - click
   * @param {*} targetInst - 事件源对应的 fiber 实例
   * @param {*} nativeEvent - 原生事件对象
   * @param {*} nativeEventTarget - 原生事件源 span 事件源对应的那个真实 DOM 元素
   */
  function SyntheticBaseEvent(
    reactName,
    reactEventType,
    targetInst,
    nativeEvent,
    nativeEventTarget
  ) {
    this._reactName = reactName
    this.type = reactEventType
    this._targetInst = targetInst
    this.nativeEvent = nativeEvent
    this.target = nativeEventTarget
    for (const propName in inter) {
      if (!inter.hasOwnProperty(propName)) {
        continue
      }
      this[propName] = nativeEvent[propName]
    }
    // 是否已经阻止默认事件
    this.isDefaultPrevented = functionThatReturnsFalse
    // 是否已经阻止继续传播
    this.isPropagationStopped = functionThatReturnsFalse
    return this
  }
  assign(SyntheticBaseEvent.prototype, {
    preventDefault() {
      const event = this.nativeEvent
      if (event.preventDefault) {
        event.preventDefault()
      } else {
        event.returnValue = false
      }
      this.isDefaultPrevented = functionThatReturnsTrue
    },
    stopPropagation() {
      const event = this.nativeEvent
      if (event.stopPropagation) {
        event.stopPropagation()
      } else {
        event.cancelBubble = true
      }
      this.isPropagationStopped = functionThatReturnsTrue
    },
  })
  return SyntheticBaseEvent
}

export const SyntheticMouseEvent = createSyntheticEvent(MouseEventInterface)
