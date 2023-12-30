// 有符号右移
// 移位时高位补的是符号位，整数补0，负数补1
let c = -4
console.log(c >> 1) // 0b10000100 -> 0b10000010

// 无符号右移
// 右移时最高位始终补0
// 正数不变，负数变为正数
let d = 0b00000111
console.log('d:', d) // 7
console.log(d >>> 1) // 3
let e = 0b10000111
console.log('e:', e) // 135
console.log(e >>> 1) // 67
