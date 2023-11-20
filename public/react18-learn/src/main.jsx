import { createRoot } from 'react-dom/client'
let element = (
  <h1>
    hello <span style={{ color: 'red' }}>world</span>
  </h1>
)
const root = createRoot(document.getElementById('root'))
// 把 element 虚拟 DOM 渲染到容器中
root.render(element)
