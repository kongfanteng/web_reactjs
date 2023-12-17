import { createRoot } from 'react-dom/client'
import * as React from './react'
let element = <FunctionComponent></FunctionComponent>

function FunctionComponent() {
  const [number, setNumber] = React.useState(0)
  return number === 0 ? (
    <ul onClick={() => setNumber(number + 1)} key="container">
      <li key="A">A</li>
      <li key="B" id="B">
        B
      </li>
      <li key="C" id="C">
        C
      </li>
      <li key="E" id="E">
        E
      </li>
      <li key="F" id="F">
        F
      </li>
    </ul>
  ) : (
    <ul onClick={() => setNumber(number + 1)} key="container">
      <li key="A">A2</li>
      <li key="C">C2</li>
      <li key="E">E2</li>
      <li key="B" id="b2">
        B2
      </li>
      <li key="G">G</li>
      <li key="D">D2</li>
    </ul>
  )
}
// old let element = React.createElement(FunctionComponent)
// new let element = jsx(FunctionComponent)
const root = createRoot(document.getElementById('root'))
// 把 element 虚拟 DOM 渲染到容器中
root.render(element)
