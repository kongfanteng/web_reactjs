import { setInitialProperties } from './ReactDOMComponent'
import { precacheFiberNode, updateFiberProps } from './ReactDOMComponentTree'

export function shouldSetTextContent(type, props) {
  return (
    typeof props.children === 'string' || typeof props.children === 'number'
  )
}

/**
 * 在原生组件初次挂载的时候，会通过此方法创建真实DOM
 * @param {*} type 类型 span
 * @param {*} props 属性
 * @param {*} internalInstanceHandle - DOM 对应 fiber
 */
export function createInstance(type, props, internalInstanceHandle) {
  const domElement = document.createElement(type)
  // 预先缓存 fiber 节点到 DOM 元素上
  precacheFiberNode(internalInstanceHandle, domElement)
  // 把属性直接保存在 DOMElement 的属性上
  updateFiberProps(domElement, props)
  return domElement
}

export function createTextInstance(content) {
  return document.createTextNode(content)
}

/**
 * 将指定的子节点添加到指定的父节点的子节点列表的开头
 * @param {Node} parent - 父节点
 * @param {Node} child - 子节点
 */
export function appendInitialChild(parent, child) {
  parent.appendChild(child)
}

export function finalizeInitialChildren(domElement, type, props) {
  setInitialProperties(domElement, type, props)
}

export function appendChild(parentInstance, child) {
  parentInstance.appendChild(child)
}
export function insertBefore(parentInstance, child, beforeChild) {
  parentInstance.insertBefore(child, beforeChild)
}
