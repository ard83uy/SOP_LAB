import * as React from "react"
import { Input } from "@/components/ui/input"

interface DecimalInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  decimals?: number
}

/**
 * Bank-style decimal input.
 * User types only digits — the comma is placed automatically.
 * Example (decimals=1): type 5 → "0,5" → type 3 → "5,3" → type 0 → "53,0"
 * Emits the numeric value with dot separator via onChange.
 */
const DecimalInput = React.forwardRef<HTMLInputElement, DecimalInputProps>(
  ({ value, onChange, decimals = 1, ...props }, ref) => {
    const toDisplay = React.useCallback((v: string | number | undefined | null): string => {
      if (v === undefined || v === null || v === "") return ""
      const num = typeof v === "string" ? parseFloat(v) : v
      if (isNaN(num)) return ""
      return num.toFixed(decimals).replace(".", ",")
    }, [decimals])

    const [display, setDisplay] = React.useState(() => toDisplay(value))
    const internalRef = React.useRef(false)

    // Sync from external value only when we're not the source of truth
    React.useEffect(() => {
      if (internalRef.current) {
        internalRef.current = false
        return
      }
      setDisplay(toDisplay(value))
    }, [value, toDisplay])

    const emit = React.useCallback((numericValue: string, e: React.ChangeEvent<HTMLInputElement>) => {
      if (!onChange) return
      const synth = { ...e, target: { ...e.target, value: numericValue } } as React.ChangeEvent<HTMLInputElement>
      onChange(synth)
    }, [onChange])

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value

      // Only keep digits
      const digits = raw.replace(/\D/g, "")

      // Empty → clear
      if (digits === "") {
        setDisplay("")
        internalRef.current = true
        emit("", e)
        return
      }

      // Remove leading zeros but keep at least one digit
      const trimmed = digits.replace(/^0+/, "") || "0"

      // Pad with leading zeros if needed (e.g. "5" with decimals=1 → "05" → "0,5")
      const padded = trimmed.padStart(decimals + 1, "0")

      const intPart = padded.slice(0, padded.length - decimals)
      const decPart = padded.slice(padded.length - decimals)
      const formatted = `${intPart},${decPart}`

      setDisplay(formatted)
      internalRef.current = true

      const numericStr = `${intPart}.${decPart}`
      emit(numericStr, e)
    }, [decimals, emit])

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow navigation, copy/paste, backspace, delete
      if (e.metaKey || e.ctrlKey) return
      if (["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Enter", "Escape"].includes(e.key)) return
      // Block non-digit keys
      if (!/^\d$/.test(e.key)) {
        e.preventDefault()
      }
    }, [])

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        {...props}
      />
    )
  }
)

DecimalInput.displayName = "DecimalInput"

export { DecimalInput }
