'use client'
import { useEffect } from 'react'
let locks = 0
let restore: (() => void) | undefined
export function useBackgroundScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    if (locks++ === 0) {
      const body = document.body
      const html = document.documentElement
      const scrollX = window.scrollX, scrollY = window.scrollY
      const saved = { position: body.style.position, top: body.style.top, left: body.style.left, width: body.style.width, overflow: body.style.overflow, htmlOverflow: html.style.overflow, behavior: html.style.scrollBehavior }
      body.style.position = 'fixed'; body.style.top = `-${scrollY}px`; body.style.left = `-${scrollX}px`; body.style.width = '100%'; body.style.overflow = 'hidden'; html.style.overflow = 'hidden'
      restore = () => {
        Object.assign(body.style, { position: saved.position, top: saved.top, left: saved.left, width: saved.width, overflow: saved.overflow })
        html.style.overflow = saved.htmlOverflow
        html.style.scrollBehavior = 'auto'
        window.scrollTo(scrollX, scrollY)
        html.style.scrollBehavior = saved.behavior
      }
    }
    return () => { if (--locks === 0) { restore?.(); restore = undefined } }
  }, [enabled])
}
