import ReactSharedInternals from 'shared/ReactSharedInternals'
import { requestEventTime, requestUpdateLane, scheduleUpdateOnFiber } from './ReactFiberWorkLoop'
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
import { NoLanes } from './ReactFiberLane'

let workInProgressHook = null
let currentHook = null
let renderLanes = NoLanes
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
  useRef: mountRef,
}
/**
 * 组件更新时执行 hook 调度的对象
 */
const HooksDispatcherOnUpdate = {
  useReducer: updateReducer,
  useState: updateState,
  useEffect: updateEffect,
  useLayoutEffect: updateLayoutEffect,
  useRef: updateRef,
}

function mountRef(initialValue) {
  const hook = mountWorkInProgressHook()
  const ref = {
    current: initialValue,
  }
  hook.memoizedState = ref
  return ref
}
function updateRef(initialValue) {
  const hook = updateWorkInProgressHook()
  return hook.memoizedState
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
 * @param {*} initialState
 * hook 的属性
 * hook.memoizedState 当前 hook 真正显示出来的状态
 * hook.baseState 第一个跳过的更新之前的老状态
 * hook.queue.lastRenderedState 上一个计算的状态
 */
function mountState(initialState) {
  const hook = mountWorkInProgressHook()
  hook.memoizedState = hook.baseState = initialState
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

/**
 * description:
 * @param {Fiber} fiber
 * @param {Array} queue
 * @param {Object} action
 */
function dispatchSetState(fiber, queue, action) {
  // 获取当前的更新赛道 1
  const lane = requestUpdateLane()
  const update = {
    lane, // 本次更新优先级就是 1
    action,
    hasEagerState: false, // 是否有急切的更新
    eagerState: null, //急切的更新状态
    next: null,
  }
  const alternate = fiber.alternate
  // QR-为什么加这个判断？
  // setNumber(number => number + 1)
  // setNumber(number => number + 2)
  // 加判断结果=3，不加判断结果=2
  // 当你派发动作后，我立刻用上一次的状态和上一次的 reducer 计算新状态
  if (
    fiber.lanes === NoLanes &&
    (alternate == null || alternate.lanes == NoLanes)
  ) {
    const { lastRenderedReducer, lastRenderedState } = queue
    const eagerState = lastRenderedReducer(lastRenderedState, action)
    update.hasEagerState = true
    update.eagerState = eagerState
    if (Object.is(eagerState, lastRenderedState)) {
      return
    }
  }
  // 下面是真正的入队更新，并调度更新逻辑
  const root = enqueueConcurrentHookUpdate(fiber, queue, update, lane)
  const eventTime = requestEventTime()
  scheduleUpdateOnFiber(root, fiber, lane, eventTime)
}
// useState 其实就是一个内置了 reducer 的 useReducer
function baseStateReducer(state, action) {
  return typeof action === 'function' ? action(state) : action
}

function updateReducer(reducer) {
  const hook = updateWorkInProgressHook()
  const queue = hook.queue
  queue.lastRenderedReducer = reducer
  const current = currentHook
  let baseQueue = current.baseQueue
  const pendingQueue = queue.pending
  //把新旧更新链表合并
  if (pendingQueue !== null) {
    if (baseQueue !== null) {
      const baseFirst = baseQueue.next
      const pendingFirst = pendingQueue.next
      baseQueue.next = pendingFirst
      pendingQueue.next = baseFirst
    }
    current.baseQueue = baseQueue = pendingQueue
    queue.pending = null
  }
  if (baseQueue !== null) {
    printQueue(baseQueue)
    const first = baseQueue.next
    let newState = current.baseState
    let newBaseState = null
    let newBaseQueueFirst = null
    let newBaseQueueLast = null
    let update = first
    do {
      const updateLane = update.lane
      const shouldSkipUpdate = !isSubsetOfLanes(renderLanes, updateLane)
      if (shouldSkipUpdate) {
        const clone = {
          lane: updateLane,
          action: update.action,
          hasEagerState: update.hasEagerState,
          eagerState: update.eagerState,
          next: null,
        }
        if (newBaseQueueLast === null) {
          newBaseQueueFirst = newBaseQueueLast = clone
          newBaseState = newState
        } else {
          newBaseQueueLast = newBaseQueueLast.next = clone
        }
        currentlyRenderingFiber.lanes = mergeLanes(
          currentlyRenderingFiber.lanes,
          updateLane
        )
      } else {
        if (newBaseQueueLast !== null) {
          const clone = {
            lane: NoLane,
            action: update.action,
            hasEagerState: update.hasEagerState,
            eagerState: update.eagerState,
            next: null,
          }
          newBaseQueueLast = newBaseQueueLast.next = clone
        }
        if (update.hasEagerState) {
          newState = update.eagerState
        } else {
          const action = update.action
          newState = reducer(newState, action)
        }
      }
      update = update.next
    } while (update !== null && update !== first)
    if (newBaseQueueLast === null) {
      newBaseState = newState
    } else {
      newBaseQueueLast.next = newBaseQueueFirst
    }
    hook.memoizedState = newState
    hook.baseState = newBaseState
    hook.baseQueue = newBaseQueueLast
    queue.lastRenderedState = newState
  }
  if (baseQueue === null) {
    queue.lanes = NoLanes
  }
  const dispatch = queue.dispatch
  return [hook.memoizedState, dispatch]
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
    baseState: currentHook.baseState,
    baseQueue: currentHook.baseQueue,
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
    lastRenderedReducer: reducer,
    lastRenderedState: initialArg,
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
  const lane = requestUpdateLane() // 待定
  const eventTime = requestEventTime()
  scheduleUpdateOnFiber(root, fiber, lane, eventTime)
}

/**
 * description: 挂载构建中的钩子函数
 */
function mountWorkInProgressHook() {
  const hook = {
    memoizedState: null, // hook 的状态 0
    queue: null, // 存放本 hook 的更新队列，queue.pending = update 的循环列表
    next: null, // 指向下一个 hook，一个函数里会有多个 hook，他们组成一个单向链表
    baseState: null, // 第一个跳过的更新前的状态
    baseQueue: null, // 跳过的更新的链表
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
export function renderWithHooks(
  current,
  workInProgress,
  Component,
  props,
  nextRenderLanes
) {
  // 当前正在渲染的车道
  renderLanes = nextRenderLanes
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
  renderLanes = NoLanes
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
function printQueue(queue) {
  const first = queue.next
  let desc = ''
  let update = first
  do {
    desc += '=>' + update.action.id
    update = update.next
  } while (update !== null && update !== first)
  desc += '=>null'
  console.log(desc)
}
