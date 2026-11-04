import { useParams } from 'react-router-dom'
import LabelStandalone from './LabelStandalone'

/** Same label page when reached from inside the app (Verify, Preview label page). */
export default function LabelRoute() {
  const { code = '' } = useParams()
  return <LabelStandalone key={code} code={code} />
}
