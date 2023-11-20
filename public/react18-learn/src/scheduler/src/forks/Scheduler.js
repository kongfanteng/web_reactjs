// TODO-优先队列-待实现逻辑
export function scheduleCallback(callback) {
  requestIdleCallback(callback)
}
