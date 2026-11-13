export interface StackGroup {
  key: 'frontend' | 'state' | 'motion' | 'backend' | 'tools' | 'ai';
  /** `sticker` is the key of the matching sticker on the pole (src/scene/stickers/stickers.ts), if any */
  items: readonly { label: string; sticker?: string }[];
}

/** The stack from the spec (§6.4), grouped for the Stack panel. */
export const STACK: readonly StackGroup[] = [
  {
    key: 'frontend',
    items: [
      { label: 'HTML', sticker: 'html5' },
      { label: 'CSS', sticker: 'css' },
      { label: 'SCSS', sticker: 'sass' },
      { label: 'Tailwind', sticker: 'tailwindcss' },
      { label: 'JavaScript', sticker: 'javascript' },
      { label: 'TypeScript', sticker: 'typescript' },
      { label: 'React', sticker: 'react' },
      { label: 'Next.js', sticker: 'nextdotjs' },
    ],
  },
  {
    key: 'state',
    items: [
      { label: 'Redux / RTK', sticker: 'redux' },
      { label: 'MobX', sticker: 'mobx' },
      { label: 'Zustand', sticker: 'zustand' },
    ],
  },
  {
    key: 'motion',
    items: [
      { label: 'Three.js / R3F', sticker: 'threedotjs' },
      { label: 'GSAP', sticker: 'greensock' },
      { label: 'Fabric.js', sticker: 'fabric' },
      { label: 'Skia / CanvasKit', sticker: 'skia' },
    ],
  },
  {
    key: 'backend',
    items: [
      { label: 'Node.js', sticker: 'nodedotjs' },
      { label: 'Nest.js', sticker: 'nestjs' },
      { label: 'Prismic', sticker: 'prismic' },
      { label: 'Contentful', sticker: 'contentful' },
      { label: 'Sanity', sticker: 'sanity' },
      { label: 'Payload', sticker: 'payloadcms' },
    ],
  },
  {
    key: 'tools',
    items: [
      { label: 'Git', sticker: 'git' },
      { label: 'GitHub', sticker: 'github' },
      { label: 'GitLab', sticker: 'gitlab' },
      { label: 'Bitbucket', sticker: 'bitbucket' },
      { label: 'n8n', sticker: 'n8n' },
    ],
  },
  {
    key: 'ai',
    items: [{ label: 'Claude', sticker: 'claude' }, { label: 'Cursor' }, { label: 'ChatGPT' }],
  },
];
