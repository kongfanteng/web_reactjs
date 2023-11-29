/**
 * 此代码块是一个无限循环，其功能是先打印数字1，然后无限循环打印数字2。
 * 其中，标签siblings用于跳转到while (true)循环的开始位置，实现循环的跳转。
 */
siblings: while (true) {
  console.log('1')
  while (true) {
    console.log('2')
    continue siblings // 跳转到'siblings'的标签所在位置
  }
}
