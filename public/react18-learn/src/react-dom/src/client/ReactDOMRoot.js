import { listenToAllSupportedEvents } from 'react-dom-bindings/src/events/DOMPluginEventSystem'
import {
  createContainer,
  updateContainer,
} from 'react-reconciler/src/ReactFiberReconciler'

function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot
}

ReactDOMRoot.prototype.render = function (children) {
  const root = this._internalRoot
  root.containerInfo.innerHTML = '' // +++
  updateContainer(children, root)
}

export function createRoot(container) {
  // dev#root
  const root = createContainer(container)
  listenToAllSupportedEvents(container)
  return new ReactDOMRoot(root)
}
