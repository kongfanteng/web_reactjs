const root = {
  name: 'A1',
  key: 'A1',
  children: [
    {
      name: 'B1',
      children: [
        {
          name: 'C1',
          children: [{ name: 'D1' }, { name: 'D2' }],
        },
      ],
    },
    {
      name: 'B2',
      children: [
        {
          name: 'C2',
          children: [{ name: 'D3' }],
        },
      ],
    },
  ],
}

function dfs(node) {
  console.log(node.name)
  /**
    A1
    B1
    C1
    D1
    D2
    B2
    C2
    D3
   */
  node.children?.forEach(dfs)
}
// dfs(root)

function bfs(node) {
  const stack = []
  stack.push(node)
  let current
  while ((current = stack.shift())) {
    console.log(current.name)
    /**
      A1
      B1
      B2
      C1
      C2
      D1
      D2
      D3
     */
    current.children?.forEach((child) => {
      stack.push(child)
    })
  }
}
bfs(root)
