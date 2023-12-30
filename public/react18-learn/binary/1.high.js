const TotalLanes = 31
// 无 0
const NoLanes = 0b0000000000000000000000000000000
const NoLane = 0b0000000000000000000000000000000
// 同步车道
const SyncLane = 0b0000000000000000000000000000001
// 输入连续水合赛道
const InputContinuousHydrationLane = 0b0000000000000000000000000000010
// 输入连续车道
const InputContinuousLane = 0b0000000000000000000000000000100
//默认水合车道
const DefaultHydrationLane = 0b0000000000000000000000000001000
//默认车道
const DefaultLane = 0b0000000000000000000000000010000
const TransitionHydrationLane = 0b0000000000000000000000000100000
const TransitionLanes = 0b0000000001111111111111111000000
const TransitionLane1 = 0b0000000000000000000000001000000
const TransitionLane2 = 0b0000000000000000000000010000000
const IdleHydrationLane = 0b0010000000000000000000000000000
const IdleLane = 0b0100000000000000000000000000000
const OffscreenLane = 0b1000000000000000000000000000000

/**
 * 获取最高优先级的车道
 * @param lanes 车道
 * 位操作效率最高
 */
function getHighestPriorityLane(lanes) {
  return lanes & -lanes
}
/**
 * 获取优先级最低的车道
 * @param lanes 车道
 * @desc 最左侧的 1
 * 31 个 lane + 0 = 32
 * 整数是 4 个字节表示，一个字节是 8 位，共 32 个字节
 */
function getLowestPriorityLane(lanes) {
  // React 此方法已删除？原因-无使用场景
  const index = 31 - Math.clz32(lanes)
  return 1 << index
}

let a = 0b00011000 // 16+8 24
console.log('getHighestPriorityLane(a):', getHighestPriorityLane(a)) // 8

console.log(5 & -5) // 1
// 00000101 5
// 10000101 -5 原码
// 11111010 -5 反码
// 11111011 -5 补码
// 00000101 5 补码
// 00000001 1

// << 左移，每一位向左移动一位，末尾补0，相当于 *2
let left = 0b0000010
//         0b0000100
console.log(left << 1) // 0b0000100

// 右移
// 有符号右移
// 移位时高位补的是符号位，整数补0，负数补1
let right = 0b0000011
console.log(right >> 1)
