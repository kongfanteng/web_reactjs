import {
  NoLane,
  SyncLane,
  InputContinuousLane,
  DefaultLane,
  IdleLane,
  getHighestPriorityLane,
  includesNonIdleLanes,
} from './ReactFiberLane'
//数字越小 优先级越高
//离散事件优先级 click onchange
export const DiscreteEventPriority = SyncLane //1
//连续事件的优先级 mousemove
export const ContinuousEventPriority = InputContinuousLane //4
//默认事件车道
export const DefaultEventPriority = DefaultLane //16
//空闲事件优先级
export const IdleEventPriority = IdleLane //最大

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

/**
 * description：lane 转成事件优先级
 * lane 31
 * 事件优先级 4
 * 调度优先级 5
 * @param {*} lanes
 */
export function lanesToEventPriority(lanes) {
  // 获取最高优先级的 lane
  let lane = getHighestPriorityLane(lanes)
  if (!isHigherEventPriority(DiscreteEventPriority, lane)) {
    return DiscreteEventPriority // 1
  }
  if (!isHigherEventPriority(ContinuousEventPriority, lane)) {
    // 4
    return ContinuousEventPriority
  }
  if (includesNonIdleLanes(lane)) {
    // 16
    return DefaultEventPriority
  }
  return IdleEventPriority
}
/**
 * description: 判断 lane 是否高于 eventPriority，是就表示 eventPriority 高于 lane
 * @param {*} eventPriority
 * @param {*} lane
 * @returns
 */
function isHigherEventPriority(eventPriority, lane) {
  return eventPriority !== 0 && eventPriority < lane
}
