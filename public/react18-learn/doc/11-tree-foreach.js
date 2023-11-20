let tree = {
  name: 'A',
  left: {
    name: 'B',
    left: { name: 'B1' },
    right: { name: 'B2' },
  },
  right: {
    name: 'C',
    left: { name: 'C1' },
    right: { name: 'C2' },
  },
}
function dfs(node) {
  /**
    A
    B
    B1
    B2
    C
    C1
    C2
   */
  console.log(node.name) // 前序
  node.left && dfs(node.left)
  /**
    B1
    B
    B2
    A
    C1
    C
    C2
   */
  // console.log(node.name) // 中序
  node.right && dfs(node.right)
  /**
    B1
    B2
    B
    C1
    C2
    C
    A
   */
  // console.log(node.name) // 后序
}
dfs(tree)
