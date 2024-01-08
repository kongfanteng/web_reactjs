import { createHostRootFiber } from './ReactFiber'
import { initialUpdateQueue } from './ReactFiberClassUpdateQueue'
import { NoLanes } from './ReactFiberLane'
/**
 * description: 根节点类
 * @param {Object} containerInfo 容器信息
 */
function FiberRootNode(containerInfo) {
  this.containerInfo = containerInfo // div#root
  // 表示此根上有哪些赛道等待被处理
  this.pendingLanes = NoLanes
}

export function createFiberRoot(containerInfo) {
  const root = new FiberRootNode(containerInfo)
  // HostRoot指的就是根节点 div#root
  const uninitializedFiber = createHostRootFiber()
  // 根容器的 current 指向当前的根
  root.current = uninitializedFiber
  // 根 fiber 的 stateNode，也就是真实 DOM 节点指向 FiberRootNode
  uninitializedFiber.stateNode = root
  initialUpdateQueue(uninitializedFiber)
  return root
}
