import { Room } from '../types'

export const rooms: Room[] = [
  {
    id: 'master-bedroom-a',
    name: '主卧A',
    size: '3.6m x 3.0m',
    description: '主卧A',
    floorplanPolygon: '86,235 300,235 300,528 86,528',
    defaultYaw: 0,
    defaultPitch: 0,
    defaultHfov: 100
  },
  {
    id: 'master-bedroom-b',
    name: '主卧B',
    size: '4.25m x 3.96m',
    description: '主卧B',
    floorplanPolygon: '390,706 676,706 676,1086 390,1086',
    defaultYaw: 15,
    defaultPitch: 0,
    defaultHfov: 100
  },
  {
    id: 'master-bathroom',
    name: '主卫',
    size: '1.76m x 2.4m',
    description: '主卫',
    floorplanPolygon: '306,288 394,288 394,514 306,514',
    defaultYaw: 270,
    defaultPitch: 0,
    defaultHfov: 90
  },
  {
    id: 'second-bedroom-a',
    name: '次卧A',
    size: '2.88m x 3.17m',
    description: '次卧A',
    floorplanPolygon: '96,726 320,726 320,1086 96,1086',
    defaultYaw: 180,
    defaultPitch: 0,
    defaultHfov: 100
  },
  {
    id: 'second-bedroom-b',
    name: '次卧B',
    size: '3.17m x 3.17m',
    description: '次卧B',
    floorplanPolygon: '1050,214 1268,214 1268,508 1050,508',
    defaultYaw: 90,
    defaultPitch: 0,
    defaultHfov: 100
  },
  {
    id: 'bathroom-public',
    name: '公卫',
    size: '2.4m x 1.3m',
    description: '公卫',
    floorplanPolygon: '398,274 494,274 494,512 398,512',
    defaultYaw: 270,
    defaultPitch: 0,
    defaultHfov: 90
  },
  {
    id: 'kitchen',
    name: '厨房',
    size: '3.6m x 2.0m',
    description: '厨房',
    floorplanPolygon: '520,292 680,292 680,488 520,488',
    defaultYaw: 0,
    defaultPitch: 0,
    defaultHfov: 100
  },
  {
    id: 'living-room',
    name: '客厅',
    size: '3.72m x 5.41m',
    description: '客厅',
    floorplanPolygon: '742,640 1082,640 1082,1044 742,1044',
    defaultYaw: 45,
    defaultPitch: 0,
    defaultHfov: 110
  },
  {
    id: 'dining-room',
    name: '餐厅',
    size: '3.71m x 3.96m',
    description: '餐厅',
    floorplanPolygon: '706,242 976,242 976,502 706,502',
    defaultYaw: 135,
    defaultPitch: 0,
    defaultHfov: 100
  },
  {
    id: 'corridor',
    name: '走廊',
    size: '1.66m x 5.41m',
    description: '走廊',
    floorplanPolygon: '462,520 734,520 734,674 462,674',
    defaultYaw: 180,
    defaultPitch: 0,
    defaultHfov: 95
  },
  {
    id: 'balcony',
    name: '阳台',
    size: '1.46m x 2.46m',
    description: '阳台',
    floorplanPolygon: '960,870 1188,870 1188,1088 960,1088',
    defaultYaw: 180,
    defaultPitch: 0,
    defaultHfov: 95
  }
]

export const getRoomById = (id: string): Room | undefined => {
  return rooms.find(room => room.id === id)
}
