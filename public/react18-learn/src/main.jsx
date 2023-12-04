import { createRoot } from 'react-dom/client'
let element = <FunctionComponent></FunctionComponent>
function FunctionComponent() {
  return (
    // hooks 用到更新，更新需要事件触发
    <h1
      onClick={(event) => console.log('ParentBubble')}
      onClickCapture={(event) => console.log('ParentCapture')}
    >
      <span
        onClick={(event) => console.log('ChildBubble')}
        onClickCapture={(event) => console.log('ChildCapture')}
      >
        world
      </span>
    </h1>
  )
}
// old let element = React.createElement(FunctionComponent)
// new let element = jsx(FunctionComponent)
const root = createRoot(document.getElementById('root'))
// 把 element 虚拟 DOM 渲染到容器中
root.render(element)
