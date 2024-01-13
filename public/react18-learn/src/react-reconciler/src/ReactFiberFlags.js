export const NoFlags = 0b0000000000000000000000000 // 0
export const Placement = 0b0000000000000000000000010 // 2
export const Update = 0b0000000000000000000000100 // 4
export const ChildDeletion = 0b0000000000000000000001000 // 子节点删除标志
export const Passive = 0b0000000000000010000000000 // 1024
export const Ref =     0b0000000000000000100000000
export const MutationMask = Placement | Update | ChildDeletion | Ref

export const LayoutMask = Update
