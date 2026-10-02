import { PUBLISHED_WORKS as WORKS, WORKS as LIBRARY, type Work } from './works'

export type WorkCategoryId = 'all' | 'ai-shorts' | 'animation' | 'product-previews'

const collections = [
  { id: 'ai-shorts' as const, label: 'AI 短片', description: '人物、情绪与故事', coverSlug: 'film-0824' },
  { id: 'animation' as const, label: '动画影像', description: '角色、空间与想象', coverSlug: 'film-0903-02' },
  { id: 'product-previews' as const, label: '带货预热', description: '产品与商业影像', coverSlug: 'preview-0928-164227' },
]

export const WORK_CATEGORIES = [
  { id: 'all' as const, label: '作品分类', description: '选择分类，进入视频作品', path: '/works', count: collections.length },
  ...collections.map((category) => ({
    ...category,
    path: `/works/category/${category.id}`,
    count: WORKS.filter((work) => work.category === category.label).length,
  })),
]

export const isWorkCategoryId = (id: unknown): id is WorkCategoryId =>
  typeof id === 'string' && WORK_CATEGORIES.some((category) => category.id === id)

export const getCategory = (id: WorkCategoryId) => WORK_CATEGORIES.find((category) => category.id === id)!

/** Directory routes are distinct from individual film routes. */
export function categoryForPath(path: string): WorkCategoryId | undefined {
  if (path === '/works' || path === '/works/') return 'all'
  const id = path.match(/^\/works\/category\/([^/]+)\/?$/)?.[1]
  return id !== 'all' && isWorkCategoryId(id) ? id : undefined
}

export const categoryForWork = (work?: Work): WorkCategoryId =>
  collections.find((category) => category.label === work?.category)?.id ?? 'all'

/** Reuse real film stills as the three collection covers; no new generated artwork. */
export const CATEGORY_NODES: Work[] = collections.map((category, index) => {
  const cover = WORKS.find(work => work.slug === category.coverSlug) ?? WORKS.find(work => work.category === category.label) ?? LIBRARY.find(work => work.slug === category.coverSlug) ?? LIBRARY[0]
  const count = getCategory(category.id).count
  return {
    ...cover,
    id: `collection-${category.id}`,
    slug: `category-${category.id}`,
    no: String(index + 1).padStart(2, '0'),
    title: category.label,
    category: '视频分类',
    tags: [],
    video: '',
    sourceFile: undefined,
    duration: '',
    description: `${count} 个视频 · ${category.description}`,
    longDescription: category.description,
    role: [],
    process: [],
  }
})

const scopedWorks: Record<WorkCategoryId, Work[]> = {
  all: CATEGORY_NODES,
  'ai-shorts': WORKS.filter((work) => work.category === 'AI 短片'),
  animation: WORKS.filter((work) => work.category === '动画影像'),
  'product-previews': WORKS.filter((work) => work.category === '带货预热'),
}

export const getWorksForCategory = (id: WorkCategoryId): Work[] => scopedWorks[id]
export const SCENE_WORKS = [...CATEGORY_NODES, ...WORKS]
