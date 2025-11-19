import { useCallback, useRef } from 'react'

interface UseLongPressOptions {
  onLongPress: (event: React.TouchEvent | React.MouseEvent) => void
  onClick?: (event: React.TouchEvent | React.MouseEvent) => void
  threshold?: number
}

/**
 * Hook for detecting long press gestures on mobile
 * @param options - Configuration options
 * @param options.onLongPress - Callback fired when long press is detected
 * @param options.onClick - Optional callback for regular clicks
 * @param options.threshold - Duration in ms to count as long press (default: 500ms)
 */
export function useLongPress({
  onLongPress,
  onClick,
  threshold = 500,
}: UseLongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const isLongPressRef = useRef(false)

  const start = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      isLongPressRef.current = false
      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true
        onLongPress(event)
      }, threshold)
    },
    [onLongPress, threshold]
  )

  const clear = useCallback(
    (event: React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      if (shouldTriggerClick && !isLongPressRef.current && onClick) {
        onClick(event)
      }
    },
    [onClick]
  )

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: (e: React.MouseEvent) => clear(e, false),
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: (e: React.TouchEvent) => clear(e, false),
  }
}
