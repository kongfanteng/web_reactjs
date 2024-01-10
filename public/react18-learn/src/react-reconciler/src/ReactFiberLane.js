export const TotalLanes = 31
export const NoLanes = 0b0000000000000000000000000000000
export const NoLane = 0b0000000000000000000000000000000
export const SyncLane = 0b0000000000000000000000000000001
export const InputContinuousHydrationLane = 0b0000000000000000000000000000010
export const InputContinuousLane = 0b0000000000000000000000000000100
export const DefaultHydrationLane = 0b0000000000000000000000000001000
export const DefaultLane = 0b0000000000000000000000000010000
export const SelectiveHydrationLane = 0b0001000000000000000000000000000
export const IdleHydrationLane = 0b0010000000000000000000000000000
export const IdleLane = 0b0100000000000000000000000000000
export const OffscreenLane = 0b1000000000000000000000000000000
export const NonIdleLanes = 0b0001111111111111111111111111111

export function markRootUpdated(root, updateLane) {
  // pendingLanes 指的是在此根上生效的 lane
  root.pendingLanes |= updateLane
}

/**
 * description: 判断是否包含 NonIdleLanes
 */
export function includesNonIdleLanes(lanes) {
  return (lanes & NonIdleLanes) !== NoLanes
}

/**
 * description: 获取当前优先级最高的车道
 * @param {*} root
 * @returns {number}
 */
export function getNextLanes(root) {
  // 先获取所有有更新的车道
  const pendingLanes = root.pendingLanes
  if (pendingLanes === NoLanes) {
    return NoLanes
  }
  const nextLanes = getHighestPriorityLanes(pendingLanes)
  return nextLanes
}

export function getHighestPriorityLanes(lanes) {
  return getHighestPriorityLane(lanes)
}
// 找到最右边的1，只能返回一个车道
export function getHighestPriorityLane(lanes) {
  /**
   * 源码此处的逻辑有大的改变
   * 以前
   * pendingLanes = 001100
   * 找到最右边的1    000100
   * nextLanes      000111
   *
   * 现在的源码已经改了
   * pendingLanes = 001100
   * 找到最右边的1    000100
   */
  return lanes & -lanes
}

export function isSubsetOfLanes(set, subset) {
  return (set & subset) === subset
}
export function mergeLanes(a, b) {
  return a | b
}
