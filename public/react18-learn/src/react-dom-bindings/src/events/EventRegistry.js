export const allNativeEvents = new Set()

/**
 * 注册两个阶段的事件
 * 当我在页面中触发 click 事件的时候，会走事件处理函数
 * 事件处理函数需要找到 DOM 元素对应的要执行React事件 onClick onClickCapture
 * @param {*} registrationName 事件名 onClick
 * @param {*} dependencies 原生事件数组 [click]
 */
export function registerTwoPhaseEvent(registrationName, dependencies) {
  // 注册冒泡事件的对应关系
  registerDirectEvent(registrationName, dependencies)
  // 注意捕获事件的对应的关系
  registerDirectEvent(registrationName + 'Capture', dependencies)
}

function registerDirectEvent(registrationName, dependencies) {
  for (let i = 0; i < dependencies.length; i++) {
    allNativeEvents.add(dependencies[i]) // [click]
  }
}
