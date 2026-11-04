import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p className="sub">That page isn’t on Landed.</p>
      <Link className="btn" to="/map">
        Open the map
      </Link>
    </>
  )
}
