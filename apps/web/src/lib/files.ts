import { useEffect, useState } from 'react'
import { apiBlob } from './api-client'

/** URL locale (blob:) d'un fichier protégé : les balises <img> ne peuvent pas envoyer le jeton elles-mêmes. */
export function useFileUrl(fileId: string | null | undefined) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!fileId) return
    let objectUrl: string | undefined
    let cancelled = false
    apiBlob(`/files/${fileId}`).then((blob) => {
      if (cancelled) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }).catch(() => undefined)
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileId])
  return url
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), { href: url, download: filename })
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadFile(fileId: string, filename: string) {
  saveBlob(await apiBlob(`/files/${fileId}`), filename)
}
