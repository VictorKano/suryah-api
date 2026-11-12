import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProfileModal } from './ProfileModal'

// ── Grouped dropdown for admin desktop nav ────────────────────────────────────

interface NavGroup {
  label: string
  items: Array<{ label: string; to: string; end?: boolean }>
}

const ADMIN_GROUPS: NavGroup[] = [
  {
    label: 'Agenda',
    items: [
      { label: 'Sessões', to: '/admin/sessions' },
      { label: 'Gerar Sessões', to: '/admin/generate' },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { label: 'Alunos', to: '/admin/students' },
      { label: 'Planos', to: '/admin/plans' },
      { label: 'Tipos de Aula', to: '/admin/class-types' },
      { label: 'Aulas Recorrentes', to: '/admin/recurring-classes' },
    ],
  },
  {
    label: 'Relatórios',
    items: [
      { label: 'Faturamento', to: '/admin/revenue' },
      { label: 'Ocupação', to: '/admin/reports' },
    ],
  },
]

function GroupDropdown({ group, onClose }: { group: NavGroup; onClose: () => void }) {
  const location = useLocation()
  const isGroupActive = group.items.some((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  )

  return (
    <div className="relative group">
      <button
        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
          isGroupActive ? 'bg-sage-600 text-white' : 'text-sage-700 hover:bg-sage-100'
        }`}
      >
        {group.label}
        <svg className="h-3 w-3 opacity-60 transition-transform group-hover:rotate-180" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {/* Dropdown — appears on hover via CSS group */}
      <div className="invisible absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-sage-100 bg-white py-1 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
        {group.items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              `block px-4 py-2 text-sm transition ${
                isActive ? 'bg-sage-50 font-medium text-sage-800' : 'text-sage-700 hover:bg-sage-50'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

// ── Main Navbar ───────────────────────────────────────────────────────────────

export function Navbar() {
  const { role, profile, logout } = useAuth()
  const navigate = useNavigate()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [navigate])

  const handleLogout = () => { setDropdownOpen(false); setMobileOpen(false); logout(); navigate('/login') }
  const handleProfile = () => { setDropdownOpen(false); setMobileOpen(false); setProfileOpen(true) }

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-4 py-2.5 text-sm font-medium transition ${isActive ? 'bg-sage-600 text-white' : 'text-sage-700 hover:bg-sage-50'}`

  const displayName = profile?.name ?? (role === 'ADMIN' ? 'Admin' : 'Aluno')
  const shortName = displayName.split(' ')[0]

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-sage-100 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src="/lotus.svg" alt="" className="h-7 w-7" />
            <span className="text-lg font-bold text-sage-700">Suryah</span>
          </Link>

          {/* Desktop nav — hidden on mobile */}
          <div className="hidden items-center gap-1 md:flex">
            {/* Student: flat links */}
            {role === 'STUDENT' && (
              <>
                <NavLink to="/schedule" className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-sage-600 text-white' : 'text-sage-700 hover:bg-sage-100'}`}>Aulas</NavLink>
                <NavLink to="/my-bookings" className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-sage-600 text-white' : 'text-sage-700 hover:bg-sage-100'}`}>Minhas Reservas</NavLink>
              </>
            )}

            {/* Admin: Home button + grouped dropdowns */}
            {role === 'ADMIN' && (
              <>
                <NavLink
                  to="/admin"
                  end
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-sage-600 text-white' : 'text-sage-700 hover:bg-sage-100'}`
                  }
                >
                  Home
                </NavLink>
                {ADMIN_GROUPS.map((group) => (
                  <GroupDropdown key={group.label} group={group} onClose={() => {}} />
                ))}
              </>
            )}

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

          {/* Mobile: avatar + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sage-600 text-xs font-bold text-white">
              {shortName.charAt(0).toUpperCase()}
            </span>
            <button onClick={() => setMobileOpen((v) => !v)}
              className="rounded-lg p-2 text-sage-600 transition hover:bg-sage-100"
              aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}>
              {mobileOpen ? (
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </nav>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="border-t border-sage-100 bg-white px-4 pb-4 pt-2 md:hidden">
            <div className="mb-3 rounded-lg bg-sage-50 px-4 py-3">
              <p className="font-medium text-sage-800">{displayName}</p>
              {profile?.email && <p className="text-xs text-sage-400">{profile.email}</p>}
            </div>

            {/* Student links */}
            {role === 'STUDENT' && (
              <div className="space-y-1">
                <NavLink to="/schedule" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Aulas</NavLink>
                <NavLink to="/my-bookings" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Minhas Reservas</NavLink>
              </div>
            )}

            {/* Admin: grouped sections */}
            {role === 'ADMIN' && (
              <div className="space-y-4">
                <div>
                  <NavLink to="/admin" end className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Home</NavLink>
                </div>
                {ADMIN_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="mb-1 px-4 text-xs font-semibold uppercase tracking-wide text-sage-400">{group.label}</p>
                    <div className="space-y-0.5">
                      {group.items.map((item) => (
                        <NavLink key={item.to} to={item.to} end={item.end} className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="my-3 border-t border-sage-100" />

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

      {(role === 'STUDENT' || role === 'ADMIN') && (
        <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} adminMode={role === 'ADMIN'} />
      )}
    </>
  )
}
