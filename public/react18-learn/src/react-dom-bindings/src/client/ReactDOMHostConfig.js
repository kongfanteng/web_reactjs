import { setInitialProperties } from './ReactDOMComponent'

export function shouldSetTextContent(type, props) {
  return (
    typeof props.children === 'string' || typeof props.children === 'number'
  )
}

export function createInstance(type) {
  const domElement = document.createElement(type)
  // updateFiberProps(domElement, props)
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
