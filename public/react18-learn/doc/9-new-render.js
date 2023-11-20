// 1. 把虚拟 DOM 构建成 fiber 树
let A1 = { type: 'div', props: { id: 'A1' } }
let B1 = { type: 'div', props: { id: 'B1' }, return: A1 }
let B2 = { type: 'div', props: { id: 'B2' }, return: A1 }
let C1 = { type: 'div', props: { id: 'C1' }, return: B1 }
let C2 = { type: 'div', props: { id: 'C2' }, return: B1 }
// A1 的第一个子节点 B1
A1.child = B1
// B1 的弟弟是 B2
B1.sibling = B2
// B1 的第一个子节点 C1
B1.child = C1
// C1的弟弟是 C2
C1.sibling = C2

// 下一个工作单元
let nextUnitOfWork = null
// render 工作循环
function workLoop() {
  while (nextUnitOfWork) {
    // 执行一个任务并返回下一个任务
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }
  console.log('render 阶段结束')
}

function performUnitOfWork(fiber) {
  // A1
  let child = beginWork(fiber)
  // 如果执行完 A1 之后，会返回 A1 的第一个子节点
  if (child) {
    return child
  }
  while (fiber) {
    // 如果没有子节点说明当前节点已经完成了渲染工作
    completeUnitOfWork(fiber) // 可以结束此 fiber 的渲染了
    if (fiber.sibling) {
      // 如果它有弟弟就返回弟弟
      return fiber.sibling
    }
    fiber = fiber.return // 如果没有弟弟让爸爸完成，然后找叔叔
  }
}

function beginWork(fiber) {
  console.log('beginWork', fiber.props.id)
  return fiber.child
}

function completeUnitOfWork(fiber) {
  console.log('completeUnitOfWork', fiber.props.id)
}

nextUnitOfWork = A1
workLoop()
/**
  打印:
  beginWork A1
  beginWork B1
  beginWork C1
  completeUnitOfWork C1
  beginWork C2
  completeUnitOfWork C2
  completeUnitOfWork B1
  beginWork B2
  completeUnitOfWork B2
  completeUnitOfWork A1
  render 阶段结束
 */
