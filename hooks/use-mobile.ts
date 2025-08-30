import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkMobile = () => {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        setIsMobile(false)
        return
      }
      
      const width = window.innerWidth
      setIsMobile(width < MOBILE_BREAKPOINT)
    }

    // Initial check
    checkMobile()

    // Set up media query listener
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      checkMobile()
    }
    
    // Use modern event listener if available, fallback to addListener
    if (mql.addEventListener) {
      mql.addEventListener("change", onChange)
    } else {
      // Fallback for older browsers
      mql.addListener(onChange)
    }
    
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", onChange)
      } else {
        // Fallback for older browsers
        mql.removeListener(onChange)
      }
    }
  }, [])

  return !!isMobile
}
