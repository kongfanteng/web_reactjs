import ReactSharedInternals from 'shared/ReactSharedInternals'
import { scheduleUpdateOnFiber } from './ReactFiberWorkLoop'
import { enqueueConcurrentHookUpdate } from './ReactFiberConcurrentUpdates'

import {
  Passive as PassiveEffect,
  Update as UpdateEffect,
} from './ReactFiberFlags'
import {
  HasEffect as HookHasEffect,
  Passive as HookPassive,
  Layout as HookLayout,
} from './ReactHookEffectTags'

let workInProgressHook = null
let currentHook = null
let currentlyRenderingFiber = null
const { ReactCurrentDispatcher } = ReactSharedInternals

/**
 * 组件挂载时执行 hook 调度的对象
 */
const HooksDispatcherOnMount = {
  useReducer: mountReducer,
  useState: mountState,
  useEffect: mountEffect,
  useLayoutEffect: mountLayoutEffect,
}
/**
 * 组件更新时执行 hook 调度的对象
 */
const HooksDispatcherOnUpdate = {
  useReducer: updateReducer,
  useState: updateState,
  useEffect: updateEffect,
  useLayoutEffect: updateLayoutEffect,
}

function mountLayoutEffect(create, deps) {
  return mountEffectImpl(UpdateEffect, HookLayout, create, deps)
}

function updateLayoutEffect(create, deps) {
  return updateEffectImpl(UpdateEffect, HookLayout, create, deps)
}

function updateEffect(create, deps) {
  return updateEffectImpl(PassiveEffect, HookPassive, create, deps)
}

function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = updateWorkInProgressHook()
  const nextDeps = deps == undefined ? null : deps
  let destroy //上一个老hook
  if (currentHook !== null) {
    // 获取此useEffect这个Hook上老的effect对象 create deps destroy
    const prevEffect = currentHook.memoizedState
    destroy = prevEffect.destroy
    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps
      // 用新数组和老数组进行对比，如果一样的话
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        // 不管要不要更新，都需要把 effect 组成完整的循环链表放到 fiber.updateQueue 中
        hook.memoizedState = pushEffect(hookFlags, create, destroy, nextDeps)

        return
      }
    }
  }
  // 如果要执行的话需要修改 fiber 的 flags
  currentlyRenderingFiber.flags |= fiberFlags
  // 如果要执行的话，添加 HookHasEffect flag
  // Q: 需要 HookHasEffect 原因？不是每个 Passive 都会执行的
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    destroy,
    nextDeps
  )
}

function mountEffect(create, deps) {
  return mountEffectImpl(PassiveEffect, HookPassive, create, deps)
}

function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = mountWorkInProgressHook()
  const nextDeps = deps === undefined ? null : deps
  // 给当前的函数组件 fiber 添加flags
  currentlyRenderingFiber.flags |= fiberFlags
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    undefined,
    nextDeps
  )
}

/**
 * description: effect 链表添加
 * @param {*} tag - effect 标签
 * @param {*} create - 创建方法
 * @param {*} destroy - 销毁方法
 * @param {*} deps - 依赖数组
 */
function pushEffect(tag, create, destroy, deps) {
  const effect = {
    tag,
    create,
    destroy,
    deps,
    next: null,
  }
  let componentUpdateQueue = currentlyRenderingFiber.updateQueue
  if (componentUpdateQueue === null) {
    componentUpdateQueue = createFunctionComponentUpdateQueue()
    currentlyRenderingFiber.updateQueue = componentUpdateQueue
    componentUpdateQueue.lastEffect = effect.next = effect
  } else {
    const lastEffect = componentUpdateQueue.lastEffect
    if (lastEffect === null) {
      componentUpdateQueue.lastEffect = effect.next = effect
    } else {
      const firstEffect = lastEffect.next
      lastEffect.next = effect
      effect.next = firstEffect
      componentUpdateQueue.lastEffect = effect
    }
  }
  return effect
}

function createFunctionComponentUpdateQueue() {
  return { lastEffect: null }
}

function updateState(initialState) {
  return updateReducer(baseStateReducer, initialState)
}

/**
 * description: 挂载状态
 * @param {any} initialState
 * @return {any}
 */
function mountState(initialState) {
  const hook = mountWorkInProgressHook()
  hook.memoizedState = initialState
  const queue = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: baseStateReducer, // 上一个reducer
    lastRenderedState: initialState, // 上一个 state
  }
  hook.queue = queue
  const dispatch = (queue.dispatch = dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    queue
  ))
  return [hook.memoizedState, dispatch]
}

function dispatchSetState(fiber, queue, action) {
  const update = {
    action,
    hasEagerState: false, // 是否有急切的更新
    eagerState: null, //急切的更新状态
    next: null,
  }
  // 当你派发动作后，我立刻用上一次的状态和上一次的 reducer 计算新状态
  const { lastRenderedReducer, lastRenderedState } = queue
  const eagerState = lastRenderedReducer(lastRenderedState, action)
  update.hasEagerState = true
  update.eagerState = eagerState
  if (Object.is(eagerState, lastRenderedState)) {
    return
  }
  //先获取队列上的老的状态和老的reducer

  // 下面是真正的入队更新，并调度更新逻辑
  const root = enqueueConcurrentHookUpdate(fiber, queue, update)
  scheduleUpdateOnFiber(root)
}
// useState 其实就是一个内置了 reducer 的 useReducer
function baseStateReducer(state, action) {
  return typeof action === 'function' ? action(state) : action
}

function updateReducer(reducer) {
  // 获取将要构建的新的 hook
  const hook = updateWorkInProgressHook()
  // 获取新的 hook 的更新队列
  const queue = hook.queue
  // 获取老 hook
  const current = currentHook
  // 获取将要生效的更新队列
  const pendingQueue = queue.pending
  // 初始化一个新的状态，取值为当前的状态
  let nextState = current.memoizedState
  if (pendingQueue !== null) {
    queue.pending = null
    const firstUpdate = pendingQueue.next
    let update = firstUpdate
    do {
      if (update.hasEagerState) {
        nextState = update.eagerState
      } else {
        const action = update.action
        nextState = reducer(nextState, action)
      }
      update = update.next
    } while (update !== null && update !== firstUpdate)
  }
  hook.memoizedState = nextState
  return [hook.memoizedState, queue.dispatch]
}
function updateWorkInProgressHook() {
  // 获取将要构建的新的 hook 的老 hook
  if (currentHook === null) {
    const current = currentlyRenderingFiber.alternate
    currentHook = current.memoizedState
  } else {
    currentHook = currentHook.next
  }
  const newHook = {
    memoizedState: currentHook.memoizedState,
    queue: currentHook.queue,
    next: null,
  }
  if (workInProgressHook === null) {
    currentlyRenderingFiber.memoizedState = workInProgressHook = newHook
  } else {
    workInProgressHook = workInProgressHook.next = newHook
  }
  return workInProgressHook
}
function mountReducer(reducer, initialArg) {
  const hook = mountWorkInProgressHook()
  hook.memoizedState = initialArg
  const queue = {
    pending: null,
    dispatch: null,
  }
  hook.queue = queue
  const dispatch = (queue.dispatch = dispatchReducerAction.bind(
    null,
    currentlyRenderingFiber,
    queue
  ))
  return [hook.memoizedState, dispatch]
}
/**
 * description: 派发状态管理器动作
 * @param {Object} fiber function 对应的 fiber
 * @param {Object} queue 本 hook 对应的更新队列
 * @param {Object} action 派发的动作
 */
function dispatchReducerAction(fiber, queue, action) {
  // 在每个 hook 里会存放一个更新队列，更新队列是一个更新对象的循环链表 update1.next = update2.next = update3.next
  const update = {
    action, // {type: 'add', payload: 1} 派发的动作
    next: null,
  }
  // 把当前的最新添加到更新队列中，并且返回当前的根 fiber
  const root = enqueueConcurrentHookUpdate(fiber, queue, update)
  scheduleUpdateOnFiber(root)
}

/**
 * description: 挂载构建中的钩子函数
 */
function mountWorkInProgressHook() {
  const hook = {
    memoizedState: null, // hook 的状态 0
    queue: null, // 存放本 hook 的更新队列，queue.pending = update 的循环列表
    next: null, // 指向下一个 hook，一个函数里会有多个 hook，他们组成一个单向链表
  }
  if (workInProgressHook === null) {
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook
  } else {
    workInProgressHook = workInProgressHook.next = hook
  }
  return workInProgressHook
}

/**
 * 函数组件渲染
 * @param {*} current - 老 fiber
 * @param {*} workInProgress - 新 fiber
 * @param {*} Component - 组件定义
 * @param {*} props - 组件属性
 * @returns 虚拟 DOM 或者说 React 元素
 */
export function renderWithHooks(current, workInProgress, Component, props) {
  currentlyRenderingFiber = workInProgress
  workInProgress.updateQueue = null
  //函数组件状态存的hooks的链表
  workInProgress.memoizedState = null
  // 需要函数组件执行前给 ReactCurrentDispatcher.current 赋值
  if (current !== null && current.memoizedState !== null) {
    ReactCurrentDispatcher.current = HooksDispatcherOnUpdate
  } else {
    ReactCurrentDispatcher.current = HooksDispatcherOnMount
  }
  const children = Component(props)
  currentlyRenderingFiber = null
  workInProgressHook = null
  currentHook = null
  return children
}

function areHookInputsEqual(nextDeps, prevDeps) {
  if (prevDeps === null) return null
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (Object.is(nextDeps[i], prevDeps[i])) {
      continue
    }
    return false
  }
  return true
}
