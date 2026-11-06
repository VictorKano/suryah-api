import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_STYLES,
  CLASS_STATUS_LABELS,
  CLASS_STATUS_STYLES,
} from '../utils/constants'
import type { BookingStatus, ClassStatus } from '../types'

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${BOOKING_STATUS_STYLES[status]}`}
    >
      {BOOKING_STATUS_LABELS[status]}
    </span>
  )
}

export function ClassStatusBadge({ status }: { status: ClassStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${CLASS_STATUS_STYLES[status]}`}
    >
      {CLASS_STATUS_LABELS[status]}
    </span>
  )
}
