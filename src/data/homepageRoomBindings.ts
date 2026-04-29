export interface HomepageRoomBindingOption {
  key: string
  label: string
  sourceRoomId: string
}

export const homepageRoomBindingOptions: HomepageRoomBindingOption[] = [
  { key: 'master-bedroom', label: '主卧', sourceRoomId: 'master-bedroom-a' },
  { key: 'master-bedroom-a', label: '主卧A', sourceRoomId: 'master-bedroom-a' },
  { key: 'master-bedroom-b', label: '主卧B', sourceRoomId: 'master-bedroom-b' },
  { key: 'study', label: '书房', sourceRoomId: 'second-bedroom-a' },
  { key: 'second-bedroom-a', label: '次卧A', sourceRoomId: 'second-bedroom-a' },
  { key: 'second-bedroom-b', label: '次卧B', sourceRoomId: 'second-bedroom-b' },
  { key: 'multi-function-room', label: '多功能室', sourceRoomId: 'second-bedroom-b' },
  { key: 'living-room', label: '客厅', sourceRoomId: 'living-room' },
  { key: 'dining-room', label: '餐厅', sourceRoomId: 'dining-room' },
  { key: 'master-bathroom', label: '主卫', sourceRoomId: 'master-bathroom' },
  { key: 'master-bathroom-a', label: '主卫A', sourceRoomId: 'master-bathroom' },
  { key: 'master-bathroom-b', label: '主卫B', sourceRoomId: 'master-bathroom' },
  { key: 'bathroom-public', label: '公卫', sourceRoomId: 'bathroom-public' },
  { key: 'guest-bathroom', label: '客卫', sourceRoomId: 'bathroom-public' },
  { key: 'guest-bathroom-a', label: '客卫A', sourceRoomId: 'bathroom-public' },
  { key: 'guest-bathroom-b', label: '客卫B', sourceRoomId: 'bathroom-public' },
  { key: 'guest-bathroom-c', label: '客卫C', sourceRoomId: 'bathroom-public' },
  { key: 'kitchen', label: '厨房', sourceRoomId: 'kitchen' },
  { key: 'corridor', label: '走廊', sourceRoomId: 'corridor' },
  { key: 'balcony', label: '阳台', sourceRoomId: 'balcony' }
]

export const homepageRoomBindingMap = new Map(
  homepageRoomBindingOptions.map(option => [option.key, option])
)
