import { createRoot } from 'react-dom/client'
import * as React from 'react'
function FunctionComponent() {
  const [number, setNumber] = React.useState(0)
  React.useEffect(() => {
    console.log('useEffect1')
    return () => {
      console.log('destroy useEffect1')
    }
  })
  React.useLayoutEffect(() => {
    console.log('useLayoutEffect2')
    return () => {
      console.log('destroy useLayoutEffect2')
    }
  })
  React.useEffect(() => {
    console.log('useEffect3')
    return () => {
      console.log('destroy useEffect3')
    }
  })
  return <button onClick={() => setNumber(number + 1)}>{number}</button>
}
let element = <FunctionComponent />
// old let element = React.createElement(FunctionComponent)
// new let element = jsx(FunctionComponent)
const root = createRoot(document.getElementById('root'))
// 把 element 虚拟 DOM 渲染到容器中
root.render(element)
