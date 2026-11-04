import { Alert } from './ui'
import type { SellerStatus } from '@/lib/types'

export function PendingNote({ status }: { status: SellerStatus }) {
  if (status === 'suspended')
    return (
      <Alert tone="bad" title="Your seller account is paused">
        The Landed team paused your listings. Contact us to sort it out.
      </Alert>
    )
  return (
    <Alert tone="info" title="Waiting for approval">
      The Landed team checks your licence or farm registration before you can activate labels. In the prototype this is a button on the admin screen; in the pilot we
      check real documents.
    </Alert>
  )
}
