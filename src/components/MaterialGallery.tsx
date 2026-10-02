import { useEffect, useId, useRef, useState } from 'react'
import type { Work, WorkMaterial } from '../data/works'

interface MaterialGalleryProps {
  references: WorkMaterial[]
  screenshots: WorkMaterial[]
}

function ImageGrid({ images }: { images: WorkMaterial[] }) {
  return (
    <div className="detail-materials__grid">
      {images.filter(image => !image.hidden).map((image) => (
        <a className="detail-materials__image" key={image.src} href={image.src} target="_blank" rel="noopener noreferrer">
          <img src={image.thumbnail} alt={image.title} loading="lazy" decoding="async" width={480} height={360} />
          <span>{image.title}</span>
        </a>
      ))}
    </div>
  )
}

/** Keep project references distinct from frames extracted from the finished film. */
export function MaterialGallery({ references, screenshots }: MaterialGalleryProps) {
  references = references.filter(image => !image.hidden)
  screenshots = screenshots.filter(image => !image.hidden)
  if (!references.length && !screenshots.length) return null
  return (
    <section className="detail-materials" aria-label="作品素材与画面">
      {references.length > 0 ? (
        <>
          <div className="detail-materials__heading">
            <h2 className="detail__h2">素材与参考</h2>
            <span>{references.length} 张</span>
          </div>
          <p className="detail__text">角色、场景与分镜参考。点击图片可查看大图。</p>
          <ImageGrid images={references.slice(0, 6)} />
          {references.length > 6 ? (
            <details className="detail-materials__more">
              <summary>展开其余 {references.length - 6} 张参考图片</summary>
              <ImageGrid images={references.slice(6)} />
            </details>
          ) : null}
        </>
      ) : null}
      {screenshots.length > 0 ? (
        <>
          <div className="detail-materials__heading">
            <h2 className="detail__h2">成片画面</h2>
            <span>{screenshots.length} 张</span>
          </div>
          <p className="detail__text">以下画面截取自本片。</p>
          <ImageGrid images={screenshots} />
        </>
      ) : null}
    </section>
  )
}

export function WorkMaterials({ work, disabled }: { work: Work; disabled: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    dialog.current?.close()
    setOpen(false)
  }, [work.id])

  return (
    <>
      <button className="works__materials-trigger" type="button" disabled={disabled} aria-haspopup="dialog"
        onClick={() => { setOpen(true); dialog.current?.showModal() }}>
        素材与参考 ↗
      </button>
      <dialog className="work-materials-dialog" ref={dialog} aria-labelledby={titleId} onClose={() => setOpen(false)}>
        <header className="work-materials-dialog__header">
          <div><span>{work.category}</span><h1 id={titleId}>{work.title}</h1></div>
          <button type="button" autoFocus aria-label="关闭素材与参考" onClick={() => dialog.current?.close()}>关闭 ×</button>
        </header>
        {open ? <>
          <p className="detail__text">{work.description}</p>
          {!work.materials?.length ? <p className="detail__text">暂未找到可确认对应的原始素材图片，以下提供成片截图。</p> : null}
          <MaterialGallery references={work.materials ?? []} screenshots={work.screenshots ?? []} />
        </> : null}
      </dialog>
    </>
  )
}
