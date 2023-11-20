import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import hasOwnProperty from 'shared/hasOwnProperty'

function ReactElement(type, key, ref, props) {
  return {
    $$typeof: REACT_ELEMENT_TYPE, // React 元素，又称虚拟 DOM
    type, // h1, span
    key, // 唯一标识
    ref, // 用以获取真实 DOM 元素，最后说明
    props, // 属性 children, style, id, ...
  }
}

const RESERVER_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true,
}

function hasValidKey(config) {
  return config.key !== undefined
}
function hasValidRef(config) {
  return config.ref !== undefined
}
export function jsxDEV(type, config) {
  let propName // 属性名
  const props = {} // 属性对象
  let key = null // 每个虚拟 DOM 可以有一个可选的 key，用以区分一个父节点下不同子节点
  let ref = null // 引入，后面可以通过这实现获取真实 DOM 的需求
  if (hasValidKey(config)) {
    key = config.key
  }
  if (hasValidRef(config)) {
    ref = config.ref
  }
  for (propName in config) {
    if (
      hasOwnProperty.call(config, propName) &&
      !RESERVER_PROPS.hasOwnProperty(propName)
    ) {
      props[propName] = config[propName]
    }
  }
  return ReactElement(type, key, ref, props)
}
