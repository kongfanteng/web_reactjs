// 在 React 进行 DOM DIFF 的时候会计算要执行的操作
const Placement = 0b001 // 1
const Update = 0b010 // 2

let flags = 0b00
// 增加操作
flags |= Placement
flags |= Update
console.log(flags.toString(2)) // 11
console.log(flags) // 3

// 0b011 & 0b110 => 0b010
flags = flags & ~Placement
console.log(flags.toString(2)) // 10
console.log(flags) // 2

// 判断是否包含
console.log((flags & Placement) === Placement) // false
console.log((flags & Update) === Update) // true

console.log((flags & Placement) === 0) // true
console.log((flags & Update) === 0) // false
