// 根 Fiber 的 tag
// 每种虚拟 DOM 都会对应自己的 fiber tag 类型

// 之后会讲到组件，组件分'类组件'和'函数组件'，因为它们都是函数，刚开始的时候
export const IndeterminateComponents = 2
export const HostRoot = 3 // 容器根节点
export const HostComponent = 5 // 原生节点 span div
export const HostText = 6 // 纯文本节点
