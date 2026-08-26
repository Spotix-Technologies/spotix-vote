import { Suspense } from "react"
import { PaymentResumeClient } from "./PaymentResumeClient"

export default function PaymentResumePage() {
  return (
    <Suspense fallback={null}>
      <PaymentResumeClient />
    </Suspense>
  )
}
