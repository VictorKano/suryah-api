import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProfileModal } from './ProfileModal'

export function Navbar() {
  const { role, profile, logout } = useAuth()
  const navigate = useNavigate()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close user dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [navigate])

  const handleLogout = () => {
    setDropdownOpen(false)
    setMobileOpen(false)
    logout()
    navigate('/login')
  }

  const handleProfile = () => {
    setDropdownOpen(false)
    setMobileOpen(false)
    setProfileOpen(true)
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
      isActive ? 'bg-sage-600 text-white' : 'text-sage-700 hover:bg-sage-100'
    }`

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-4 py-2.5 text-sm font-medium transition ${
      isActive ? 'bg-sage-600 text-white' : 'text-sage-700 hover:bg-sage-50'
    }`

  const displayName = profile?.name ?? (role === 'ADMIN' ? 'Admin' : 'Aluno')
  const shortName = displayName.split(' ')[0]

  const studentLinks = (
    <>
      <NavLink to="/schedule" className={linkClass} onClick={() => setMobileOpen(false)}>Aulas</NavLink>
      <NavLink to="/my-bookings" className={linkClass} onClick={() => setMobileOpen(false)}>Minhas Reservas</NavLink>
    </>
  )

  const adminLinks = (
    <>
      <NavLink to="/admin" className={linkClass} end onClick={() => setMobileOpen(false)}>Painel</NavLink>
      <NavLink to="/admin/class-types" className={linkClass} onClick={() => setMobileOpen(false)}>Tipos de Aula</NavLink>
      <NavLink to="/admin/recurring-classes" className={linkClass} onClick={() => setMobileOpen(false)}>Aulas Recorrentes</NavLink>
      <NavLink to="/admin/sessions" className={linkClass} onClick={() => setMobileOpen(false)}>Sessões</NavLink>
      <NavLink to="/admin/students" className={linkClass} onClick={() => setMobileOpen(false)}>Alunos</NavLink>
      <NavLink to="/admin/reports" className={linkClass} onClick={() => setMobileOpen(false)}>Relatórios</NavLink>
      <NavLink to="/admin/generate" className={linkClass} onClick={() => setMobileOpen(false)}>Gerar</NavLink>
    </>
  )

  const studentMobileLinks = (
    <>
      <NavLink to="/schedule" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Aulas</NavLink>
      <NavLink to="/my-bookings" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Minhas Reservas</NavLink>
    </>
  )

  const adminMobileLinks = (
    <>
      <NavLink to="/admin" className={mobileLinkClass} end onClick={() => setMobileOpen(false)}>Painel</NavLink>
      <NavLink to="/admin/class-types" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Tipos de Aula</NavLink>
      <NavLink to="/admin/recurring-classes" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Aulas Recorrentes</NavLink>
      <NavLink to="/admin/sessions" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Sessões</NavLink>
      <NavLink to="/admin/students" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Alunos</NavLink>
      <NavLink to="/admin/reports" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Relatórios</NavLink>
      <NavLink to="/admin/generate" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Gerar</NavLink>
    </>
  )

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-sage-100 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src="/lotus.svg" alt="" className="h-7 w-7" />
            <span className="text-lg font-bold text-sage-700">Suryah</span>
          </Link>

          {/* Desktop nav links — hidden on mobile */}
          <div className="hidden items-center gap-1 md:flex">
            {role === 'STUDENT' && studentLinks}
            {role === 'ADMIN' && adminLinks}

            {/* User dropdown */}
            <div className="relative ml-2 border-l border-sage-100 pl-3" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-sage-700 transition hover:bg-sage-100"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sage-600 text-xs font-bold text-white">
                  {shortName.charAt(0).toUpperCase()}
                </span>
                <span>{shortName}</span>
                <svg className={`h-3 w-3 text-sage-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 4l4 4 4-4" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-1 w-48 rounded-xl border border-sage-100 bg-white py-1 shadow-lg">
                  <div className="border-b border-sage-50 px-4 py-2">
                    <p className="truncate text-sm font-medium text-sage-800">{displayName}</p>
                    {profile?.email && <p className="truncate text-xs text-sage-400">{profile.email}</p>}
                  </div>
                  {(role === 'STUDENT' || role === 'ADMIN') && (
                    <button onClick={handleProfile} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-sage-700 hover:bg-sage-50">
                      <svg className="h-4 w-4 text-sage-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0H3z" />
                      </svg>
                      {role === 'ADMIN' ? 'Alterar Senha' : 'Meu Perfil'}
                    </button>
                  )}
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h6a1 1 0 010 2H5v10h5a1 1 0 010 2H4a1 1 0 01-1-1V4zm10.293 3.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L14.586 11H9a1 1 0 010-2h5.586l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: avatar + hamburger — visible only on small screens */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Avatar shows name initial */}
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sage-600 text-xs font-bold text-white">
              {shortName.charAt(0).toUpperCase()}
            </span>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-lg p-2 text-sage-600 transition hover:bg-sage-100"
              aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                /* X icon */
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                /* Hamburger icon */
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </nav>

        {/* Mobile drawer — slides down when open */}
        {mobileOpen && (
          <div className="border-t border-sage-100 bg-white px-4 pb-4 pt-2 md:hidden">
            {/* User info */}
            <div className="mb-3 rounded-lg bg-sage-50 px-4 py-3">
              <p className="font-medium text-sage-800">{displayName}</p>
              {profile?.email && <p className="text-xs text-sage-400">{profile.email}</p>}
            </div>

            {/* Nav links */}
            <div className="space-y-1">
              {role === 'STUDENT' && studentMobileLinks}
              {role === 'ADMIN' && adminMobileLinks}
            </div>

            {/* Divider */}
            <div className="my-3 border-t border-sage-100" />

            {/* Profile + logout */}
            <div className="space-y-1">
              {(role === 'STUDENT' || role === 'ADMIN') && (
                <button onClick={handleProfile} className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-sage-700 hover:bg-sage-50">
                  <svg className="h-4 w-4 text-sage-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0H3z" />
                  </svg>
                  {role === 'ADMIN' ? 'Alterar Senha' : 'Meu Perfil'}
                </button>
              )}
              <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h6a1 1 0 010 2H5v10h5a1 1 0 010 2H4a1 1 0 01-1-1V4zm10.293 3.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L14.586 11H9a1 1 0 010-2h5.586l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Sair
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Profile modal */}
      {(role === 'STUDENT' || role === 'ADMIN') && (
        <ProfileModal
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          adminMode={role === 'ADMIN'}
        />
      )}
    </>
  )
}
