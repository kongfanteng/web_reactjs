/* 
// 定义一个虚拟 DOM
let element = (
  <div id="A1">
    <div id="B1">
      <div id="B2"></div>
    </div>
  </div>
)
*/
let vDOM = {
  type: 'div',
  key: 'A1',
  props: {
    id: 'A1',
    children: [
      {
        type: 'div',
        key: 'B1',
        props: {
          id: 'B1',
          children: [
            {
              type: 'div',
              key: 'B2',
              props: { id: 'B2' },
            },
          ],
        },
      },
    ],
  },
}

// 以前我们直接把 vdom 渲染成了真实 DOM
function render(vdom, container) {
  // 根据虚拟 DOM 生成真实 DOM
  let dom = document.createElement(vdom.type)
  // 把除 children 以外的属性拷贝到真实 DOM 上
  Object.keys(vdom.props)
    .filter((key) => key !== 'children')
    .forEach((key) => {
      dom[key] = vdom.props[key]
    })
  // 把此虚拟 DOM 的子节点，也渲染到父节点真实 DOM 上
  if (Array.isArray(vdom.props.children)) {
    vdom.props.children.forEach((child) => render(child, dom))
  }
  container.appendChild(dom)
}
