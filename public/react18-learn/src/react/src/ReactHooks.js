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

export function useState(initialState) {
  const dispatcher = resolveDispatcher()
  return dispatcher.useState(initialState)
}

/**
 * description: 副作用执行
 * @param {*} create
 * @example
    1.发送ajax请求
    2.设置订阅/启动定时器
    3.手动更改真实DOM
 */
export function useEffect(create, deps) {
  const dispatcher = resolveDispatcher()
  return dispatcher.useEffect(create, deps)
}

export function useLayoutEffect(create, deps) {
  const dispatcher = resolveDispatcher()
  return dispatcher.useLayoutEffect(create, deps)
}

export function useRef(initialValue) {
  const dispatcher = resolveDispatcher()
  return dispatcher.useRef(initialValue)
}
