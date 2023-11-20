let flags = 0b00
flags |= 0b10 // 0b10
flags |= 0b01 // 0b11
console.log(flags) // 3
console.log(flags.toString(2)) // 11

// 每个虚拟 DOM 会有一个类型 $$typeof  REACT_ELEMENT_TYPE，React 元素类型，也就是虚拟 DOM
