import * as React from "react"

const MOBILE_BREAKPOINT = 768

type Subscriber = () => void

const getSnapshot = () => {
  if (typeof window === "undefined") return false
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
}

const subscribe = (callback: Subscriber) => {
  if (typeof window === "undefined") return () => {}
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  const onChange = () => callback()

  if (mql.addEventListener) {
    mql.addEventListener("change", onChange)
  } else {
    mql.addListener(onChange)
  }

  return () => {
    if (mql.removeEventListener) {
      mql.removeEventListener("change", onChange)
    } else {
      mql.removeListener(onChange)
    }
  }
}

export function useIsMobile() {
  const isMobile = React.useSyncExternalStore(subscribe, getSnapshot, () => false)
  return isMobile
}
