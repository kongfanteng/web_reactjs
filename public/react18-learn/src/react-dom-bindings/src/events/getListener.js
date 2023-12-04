import { getFiberCurrentPropsFromNode } from '../client/ReactDOMComponentTree'

/**
 * description: 获取 fiber 上对应回调函数
 * @param {*} inst
 * @param {*} registrationName
 * @returns
 */
export default function getListener(inst, registrationName) {
  const { stateNode } = inst
  if (stateNode === null) return null
  const props = getFiberCurrentPropsFromNode(stateNode)
  if (props == null) return null
  const listener = props[registrationName] //props.onClick
  return listener
}
