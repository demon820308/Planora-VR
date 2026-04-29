import { Style } from '../types'

export const styles: Style[] = [
  {
    id: 'white',
    name: '白模',
    description: '用于检查空间结构和基础材质关系。',
    folder: 'white'
  },
  {
    id: 'italian',
    name: '意式风',
    description: '偏暖木色、皮面和低饱和材质的意式表达。',
    folder: 'italian'
  },
  {
    id: 'french',
    name: '法式风',
    description: '轻盈线条、石膏感和精致比例的法式氛围。',
    folder: 'french'
  },
  {
    id: 'modern',
    name: '现代风',
    description: '克制留白和功能导向的现代空间语言。',
    folder: 'modern'
  },
  {
    id: 'wood',
    name: '原木风',
    description: '自然木质基调与柔和肌理的平衡感。',
    folder: 'wood'
  }
]

export const getStyleById = (id: string): Style | undefined => {
  return styles.find(style => style.id === id)
}
