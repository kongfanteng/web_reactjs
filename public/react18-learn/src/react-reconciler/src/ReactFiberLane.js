import { allowConcurrentByDefault } from 'shared/ReactFeatureFlags'

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

// 没有时间戳
export const NoTimestamp = -1

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
export function getNextLanes(root, wipLanes) {
  // 先获取所有有更新的车道
  const pendingLanes = root.pendingLanes
  if (pendingLanes === NoLanes) {
    return NoLanes
  }
  const nextLanes = getHighestPriorityLanes(pendingLanes)
  if (wipLanes !== NoLane && wipLanes !== nextLanes) {
    // 新的车道值比渲染中的车道大，说明新的车道优先级更低
    if (nextLanes > wipLanes) {
      return wipLanes
    }
  }
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

/**
 * description: 判断是否包含阻塞的车道
 * @param {*} root
 * @param {*} lanes
 */
export function includesBlockingLane(root, lanes) {
  // 如果允许默认并行渲染
  if (allowConcurrentByDefault) {
    return false
  }
  const SyncDefaultLanes = InputContinuousLane | DefaultLane
  return (lanes & SyncDefaultLanes) !== NoLane
}

export function markStarvedLanesAsExpired(root, currentTime) {
  // 获取当前有更新赛道
  const pendingLanes = root.pendingLanes
  // 记录每个赛道上的过期时间
  const expirationTimes = root.expirationTimes
  let lanes = pendingLanes
  while (lanes > 0) {
    const index = pickArbitraryLaneIndex(lanes)
    const lane = 1 << index
    const expirationTime = expirationTimes[index]
    // 如果此赛道上没有过期时间, 说明没有为此车道设置过期时间
    if (expirationTime === NoTimestamp) {
      expirationTimes[index] = computeExpirationTime(lane, currentTime)
    } else if (expirationTime <= currentTime) {
      // 把此车道添加到过期车道里
      root.expiredLanes |= lane
    }
    lanes &= ~lane
  }
}
/**
 * description: 取最左侧的 1 的索引
 * @param {*} lanes
 * 00011000
 * 7-3=4
 */
function pickArbitraryLaneIndex(lanes) {
  // clz32 返回最左侧的 1 的左边 0 的个数 000100010
  return 31 - Math.clz32(lanes)
}

function computeExpirationTime(lane, currentTime) {
  switch (lane) {
    case SyncLane:
    case InputContinuousLane:
      return currentTime + 250
    case DefaultLane:
      return currentTime + 5000
    case IdleLane:
      return NoTimestamp
    default:
      return NoTimestamp
  }
}
export function includesExpiredLane(root, lanes) {
  return (lanes & root.expiredLanes) !== NoLanes
}
export function markRootFinished(root, remainingLanes) {
  // pendingLanes 根上所有的将要被渲染的车道 1 和 2
  // reminingLanes 2
  // noLongerPendingLanes 指的是已经更新过的 lane
  const noLongerPendingLanes = root.pendingLanes & ~remainingLanes
  root.pendingLanes = remainingLanes
  const expirationTimes = root.expirationTimes
  let lanes = noLongerPendingLanes
  while (lanes > 0) {
    // 获取左侧的 1 的索引
    const index = pickArbitraryLaneIndex(lanes)
    const lane = 1 << index
    // 清除已经计算过的车道的过期时间
    expirationTimes[index] = NoTimestamp
    lanes &= ~lane
  }
}
export function createLaneMap(initial) {
  const laneMap = []
  for (let i = 0; i < TotalLanes; i++) {
    laneMap.push(initial)
  }
  return laneMap
}