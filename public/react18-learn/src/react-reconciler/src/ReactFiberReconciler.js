import { createUpdate, enqueueUpdate } from './ReactFiberClassUpdateQueue'
import { createFiberRoot } from './ReactFiberRoot'
import { requestUpdateLane, scheduleUpdateOnFiber } from './ReactFiberWorkLoop'

export function createContainer(containerInfo) {
  return createFiberRoot(containerInfo)
}
/**
 * 更新容器，把虚拟 dom element 变成真实 DOM 插入到 container 容器中
 * @param {*} element 虚拟 DOM
 * @param {*} container DOM 容器 FiberRootNode containerInfo div#root
 */
export function updateContainer(element, container) {
  // 获取当前的根 fiber
  const current = container.current
  // 请求一个更新车道
  const lane = requestUpdateLane(current)
  // 创建更新
  const update = createUpdate(lane)
  // 要更新的虚拟 DOM
  update.payload = { element }
  // 把此更新对象添加到 current 这个根 Fiber 的更新队列上
  const root = enqueueUpdate(current, update, lane)
  scheduleUpdateOnFiber(root, current, lane)
}
