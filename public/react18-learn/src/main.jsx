import { createRoot } from 'react-dom/client'
let element = <FunctionComponent></FunctionComponent>
function FunctionComponent() {
  return (
    <h1 id="container">
      hello <span style={{ color: 'red' }}>world</span>
    </h1>
  )
}
// old let element = React.createElement(FunctionComponent)
// new let element = jsx(FunctionComponent)
const root = createRoot(document.getElementById('root'))
// 把 element 虚拟 DOM 渲染到容器中
root.render(element)

