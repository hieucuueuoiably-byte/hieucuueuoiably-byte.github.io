/** 共用的小图标。全部用 currentColor，方便跟随主题色切换。 */

export function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 5.14v13.72c0 .8.87 1.29 1.55.88l10.9-6.86a1.03 1.03 0 0 0 0-1.76L9.55 4.26A1.03 1.03 0 0 0 8 5.14Z" />
    </svg>
  )
}

export function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="6" y="4.5" width="4.2" height="15" rx="1.4" />
      <rect x="13.8" y="4.5" width="4.2" height="15" rx="1.4" />
    </svg>
  )
}

export function PrevIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M19 5.6v12.8c0 .72-.79 1.16-1.4.79l-9.1-5.5a.93.93 0 0 1 0-1.58l9.1-5.5c.61-.37 1.4.07 1.4.79Z" />
      <rect x="4" y="4.6" width="2.6" height="14.8" rx="1.2" />
    </svg>
  )
}

export function NextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 5.6v12.8c0 .72.79 1.16 1.4.79l9.1-5.5a.93.93 0 0 0 0-1.58l-9.1-5.5C5.79 4.74 5 5.18 5 5.6Z" />
      <rect x="17.4" y="4.6" width="2.6" height="14.8" rx="1.2" />
    </svg>
  )
}

/** 首页圆盘：参考站 home__vynil 的对应物 —— 一枚慢慢自转的唱片 */
export function DiscIcon() {
  return (
    <svg viewBox="0 0 211 212" fill="none" aria-hidden="true" focusable="false">
      <circle cx="105.5" cy="106" r="104.4" fill="#231F20" />
      <circle cx="105.5" cy="106" r="88" fill="none" stroke="#F8786E" strokeWidth="2.5" />
      <circle cx="105.5" cy="106" r="72" fill="none" stroke="#FFCC8E" strokeWidth="1.6" />
      <circle cx="105.5" cy="106" r="52" fill="#F3A6B8" />
      <circle cx="105.5" cy="106" r="34" fill="#FFD98E" />
      <circle cx="105.5" cy="106" r="11" fill="#231F20" />
      <circle cx="105.5" cy="106" r="4.2" fill="#FEECE3" />
      <text
        x="105.5"
        y="106"
        fill="#FEECE3"
        fontSize="15.5"
        fontWeight="700"
        letterSpacing="3.1"
        fontFamily="Libre Franklin, Helvetica, Arial, sans-serif"
      >
        <textPath href="#discPath" startOffset="0">
          YOUR INTERACTIVE PORTFOLIO · YOUR INTERACTIVE PORTFOLIO ·
        </textPath>
      </text>
      <defs>
        <path id="discPath" d="M 105.5 106 m -94 0 a 94 94 0 1 1 188 0 a 94 94 0 1 1 -188 0" />
      </defs>
    </svg>
  )
}

/** 前景云层：转场"上涌"用的有机形状，也用于首页前景层 */
export function CloudShape({ className, fill = 'currentColor' }: { className?: string; fill?: string }) {
  return (
    <svg className={className} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <path
        fill={fill}
        d="M0 470c42-4 74-30 104-58 46-44 78-104 138-124 54-18 114 2 168 20 62 20 126 36 190 26 58-9 108-42 164-56 62-16 130-10 186 24 50 31 88 80 122 128 26 37 48 76 78 110 34 38 78 66 128 74v246H0Z"
      />
    </svg>
  )
}

/** 转场遮挡层用的巨大有机形状（参考站是 1947×1947 的云朵） */
export function WipeBlob({ fill = 'currentColor' }: { fill?: string }) {
  return (
    <svg viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
      <path
        fill={fill}
        d="M500 40c96 0 150 44 214 96 62 50 138 74 186 136 44 57 54 138 44 210-10 74-44 142-96 196-50 52-118 86-186 106-66 20-140 30-206 14-64-15-116-60-172-96-58-37-126-64-160-124-32-56-34-130-20-194 14-66 52-124 96-176 44-51 100-90 160-118 46-22 94-44 140-50Zm0 120c-84 0-160 36-216 92-56 56-92 132-92 216s36 160 92 216c56 56 132 92 216 92s160-36 216-92c56-56 92-132 92-216s-36-160-92-216c-56-56-132-92-216-92Z"
      />
    </svg>
  )
}

export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M4 12h15m0 0-6-6m6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ScrollMouse() {
  return (
    <svg viewBox="0 0 14 22" fill="none" aria-hidden="true" focusable="false">
      <rect x="0.8" y="0.8" width="12.4" height="20.4" rx="6.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 5.4v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
