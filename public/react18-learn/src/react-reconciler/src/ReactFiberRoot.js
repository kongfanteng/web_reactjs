import { createHostRootFiber } from './ReactFiber'
import { initialUpdateQueue } from './ReactFiberClassUpdateQueue'

function FiberRootNode(containerInfo) {
  this.containerInfo = containerInfo
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
