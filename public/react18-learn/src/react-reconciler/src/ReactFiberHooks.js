/**
 * 函数组件渲染
 * @param {*} current - 老 fiber
 * @param {*} workInProgress - 新 fiber
 * @param {*} Component - 组件定义
 * @param {*} props - 组件属性
 * @returns 虚拟 DOM 或者说 React 元素
 */
export function renderWithHooks(current, workInProgress, Component, props) {
  const children = Component(props)
  return children
}
