export interface ContactItem { label: string; value: string; href: string }

export const SITE = {
  name: '作品集网站',
  tagline: 'AI 影像 · 动画 · 短片',
  about: {
    introTitle: '让想象，进入画面。',
    whatTitle: ['AI 影像，', '不止一种可能。'],
    paragraphs: [
      '这是一个 AI 影像、动画与短片的作品集。每一件作品都可以从封面进入观看，跟随不同的画面、人物和节奏，探索影像的可能。',
      '这里收录角色演绎、产品影像与短片创作。使用滚轮、方向键或作品导航，在不同项目之间切换；进入作品后，可查看成片与对应的项目信息。',
    ],
    flow: [
      { step: '01 影像', text: '从一幅画面开始，进入完整的影片。' },
      { step: '02 动画', text: '观看角色、空间与动作如何展开。' },
      { step: '03 短片', text: '让一段情绪，在镜头与声音中发生。' },
    ],
  },
  contacts: [] as ContactItem[],
  sections: [
    { id: 'about-intro', label: '开篇' },
    { id: 'about-what', label: '关于' },
    { id: 'about-flow', label: '内容' },
    { id: 'about-contact', label: '继续观看' },
  ],
}
