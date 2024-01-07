import { NoLane } from './ReactFiberLane'
let currentUpdatePriority = NoLane
/**
 * description: 获取当前更新优先级
 * @return {NoLane|number}
 */
export function getCurrentUpdatePriority() {
  return currentUpdatePriority
}
export function setCurrentUpdatePriority(newPriority) {
  currentUpdatePriority = newPriority
}
