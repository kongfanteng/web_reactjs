import ReactCurrentDispatcher from './ReactCurrentDispatcher'
/**
 * description: 状态管理器
 * @param {Function} reducer 状态管理器函数，用于根据老状态和动作计算新状态
 * @param {any} initialArg 初始状态
 */
export function useReducer(reducer, initialArg) {
  const dispatcher = resolveDispatcher()
  return dispatcher.useReducer(reducer, initialArg)
}


function resolveDispatcher() {
  return ReactCurrentDispatcher.current
}

export function useState(reducer, initialArg) {
  const dispatcher = resolveDispatcher()
  return dispatcher.useState(reducer, initialArg)
}