"use client"

/**
 * app/otp/OtpClient.tsx
 *
 * Six single-digit boxes for entering the OTP a Supabase Auth email
 * sends (see the "Confirm your email" template in
 * /supabase-email-templates/confirm-signup.html — {{ .Token }}).
 *
 * Flow:
 *   1. Type digits. Each filled box outlines brand-purple as soon as it
 *      has a digit (see the border-brass class toggle below).
 *   2. The moment all 6 boxes are filled, the active input is blurred
 *      (drops the mobile keypad) and verification starts.
 *   3. The boxes split out of their row and arrange into a ring, then
 *      the whole ring spins continuously (see .otp-spin-wrapper in
 *      globals.css) while supabase.auth.verifyOtp() is in flight. The
 *      center shows a rotating set of "verifying" one-liners.
 *   4. Wrong code: the ring stops, boxes fall back into a row, cleared,
 *      ready to retry. Right code: a checkmark shows briefly, then we
 *      redirect — verifyOtp() itself is what establishes the signed-in
 *      session, there's no separate "log them in" step needed even on
 *      the loggedInWaitingOTP path from the login page.
 *
 * Only digits are ever accepted (onChange strips anything else), and
 * every input uses inputMode="numeric" so mobile shows a numeric pad.
 */

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/election/auth-client"

const OTP_LENGTH = 6
const RING_RADIUS = 92
const BOX_GAP = 52 // row spacing when boxes are in a horizontal line

const VERIFYING_MESSAGES = [
  "Verifying from the cosmos…",
  "Consulting the token oracle…",
  "Aligning quantum bits…",
  "Pinging the mothership…",
  "Decrypting star-signals…",
  "Counting digits in another dimension…",
  "Asking the server nicely…",
]

type Phase = "input" | "verifying" | "success" | "error"

export function OtpClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const email = searchParams.get("email") ?? ""
  const loggedInWaitingOTP = searchParams.get("loggedInWaitingOTP") === "true"

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""))
  const [phase, setPhase] = useState<Phase>("input")
  const [messageIndex, setMessageIndex] = useState(0)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [resent, setResent] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const messageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) clearInterval(messageTimerRef.current)
    }
  }, [])

  function focusBox(index: number) {
    inputRefs.current[index]?.focus()
  }

  function resetBoxes() {
    setDigits(Array(OTP_LENGTH).fill(""))
    setTimeout(() => focusBox(0), 50)
  }

  async function submitCode(code: string) {
    if (!email) {
      setPhase("error")
      setErrorText("Missing email — go back and try again.")
      return
    }

    setPhase("verifying")
    setMessageIndex(0)
    messageTimerRef.current = setInterval(() => {
      setMessageIndex((i) => (i + 1) % VERIFYING_MESSAGES.length)
    }, 2000)

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    })

    if (messageTimerRef.current) clearInterval(messageTimerRef.current)

    if (error) {
      setPhase("error")
      setErrorText(error.message || "That code didn't work.")
      setTimeout(() => {
        setPhase("input")
        setErrorText(null)
        resetBoxes()
      }, 1500)
      return
    }

    setPhase("success")
    setTimeout(() => {
      router.push("/elections")
      router.refresh()
    }, 1000)
  }

  function handleChange(index: number, raw: string) {
    if (phase !== "input") return
    const value = raw.replace(/[^0-9]/g, "").slice(-1) // digits only, last char typed
    const next = [...digits]
    next[index] = value
    setDigits(next)

    if (value && index < OTP_LENGTH - 1) {
      focusBox(index + 1)
    }

    if (value && index === OTP_LENGTH - 1 && next.every((d) => d !== "")) {
      // Last box just got filled and every box has a digit — drop the
      // mobile keypad, then start the verify animation.
      inputRefs.current[index]?.blur()
      submitCode(next.join(""))
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (phase !== "input") return
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      focusBox(index - 1)
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    if (phase !== "input") return
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, OTP_LENGTH)
    if (!pasted) return
    e.preventDefault()
    const next = Array(OTP_LENGTH).fill("")
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    if (pasted.length === OTP_LENGTH) {
      inputRefs.current[OTP_LENGTH - 1]?.blur()
      submitCode(pasted)
    } else {
      focusBox(pasted.length)
    }
  }

  async function handleResend() {
    if (!email) return
    setResent(false)
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.resend({ type: "signup", email })
    setResent(true)
  }

  const inCircle = phase !== "input"
  const isSpinning = phase === "verifying"

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-display text-2xl text-paper">
        {loggedInWaitingOTP ? "Almost there — verify to sign in" : "Verify your email"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        Enter the 6-digit code we sent to <span className="text-paper">{email || "your email"}</span>.
      </p>

      <div className="relative mt-12 flex h-64 w-full items-center justify-center">
        <div className={`relative h-full w-full ${isSpinning ? "otp-spin-wrapper" : ""}`}>
          {digits.map((digit, i) => {
            const angle = (i / OTP_LENGTH) * Math.PI * 2 - Math.PI / 2
            const circleX = Math.cos(angle) * RING_RADIUS
            const circleY = Math.sin(angle) * RING_RADIUS
            const rowX = (i - (OTP_LENGTH - 1) / 2) * BOX_GAP

            const tx = inCircle ? circleX : rowX
            const ty = inCircle ? circleY : 0

            const filled = digit !== ""
            const isErrorState = phase === "error"

            return (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el
                }}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                disabled={phase !== "input"}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={1}
                aria-label={`Digit ${i + 1}`}
                className={[
                  "absolute left-1/2 top-1/2 h-12 w-12 rounded-lg border bg-ink text-center font-mono text-xl text-paper outline-none",
                  "transition-[transform,border-color,background-color] duration-500 ease-out",
                  filled ? "border-brass" : "border-line",
                  isErrorState ? "border-danger" : "",
                ].join(" ")}
                style={{
                  transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px)`,
                }}
              />
            )
          })}
        </div>

        {phase !== "input" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-10">
            {phase === "verifying" && (
              <p key={messageIndex} className="otp-center-text font-mono text-xs text-muted">
                {VERIFYING_MESSAGES[messageIndex]}
              </p>
            )}
            {phase === "success" && (
              <p className="otp-center-text font-mono text-sm text-success">✓ Verified</p>
            )}
            {phase === "error" && (
              <p className="otp-center-text font-mono text-xs text-danger">Wrong code — try again</p>
            )}
          </div>
        )}
      </div>

      {errorText && phase === "input" && (
        <p className="mt-2 text-sm text-danger">{errorText}</p>
      )}

      <button
        type="button"
        onClick={handleResend}
        disabled={phase !== "input" || !email}
        className="mt-8 text-sm text-brass hover:text-brass-soft disabled:opacity-40"
      >
        {resent ? "New code sent ✓" : "Resend code"}
      </button>

      <Link href="/auth/login" className="mt-4 text-sm text-muted hover:text-paper">
        Back to sign in
      </Link>
    </main>
  )
}
