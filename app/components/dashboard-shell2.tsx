// components/Sidebar.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Icons as components (you can replace with lucide-react or heroicons)
const Icons = {
  Overview: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Verify: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  History: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Integrations: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  API: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Pricing: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M12 9v6" />
      <path d="M9 12h6" />
    </svg>
  ),
  Account: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Logout: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Credits: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12" />
      <path d="M6 12h12" />
    </svg>
  ),
};

interface NavItem {
  name: string;
  href: string;
  icon: keyof typeof Icons;
  badge?: string;
}

const navigation: NavItem[] = [
  { name: 'Overview', href: '/dashboard', icon: 'Overview' },
  { name: 'Verify', href: '/verify', icon: 'Verify' },
  { name: 'History', href: '/history', icon: 'History' },
  { name: 'Integrations', href: '/integrations', icon: 'Integrations' },
  { name: 'API', href: '/api-keys', icon: 'API' },
  { name: 'Pricing', href: '/pricing', icon: 'Pricing' },
  { name: 'Account', href: '/account', icon: 'Account' },
];

interface SidebarProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
    credits?: number;
  };
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

export default function Sidebar({ user, isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <aside
      className={`
        fixed top-0 left-0 z-40 h-screen
        bg-white border-r border-gray-200
        transition-all duration-300 ease-in-out
        flex flex-col
        ${isCollapsed ? 'w-[72px]' : 'w-[240px]'}
      `}
    >
      {/* Logo Section */}
      <div
        className={`
          flex items-center justify-between h-16 border-b border-gray-100
          ${isCollapsed ? 'px-2' : 'px-4'}
        `}
      >
        <Link
          href="/dashboard"
          aria-label="BoltRoute"
          className="flex items-center gap-2 shrink-0"
        >
          {/* BoltRoute Logo */}
          {isCollapsed ? (
            <Image
              src="/bolt.png"
              alt="BoltRoute"
              width={40}
              height={40}
              className="h-8 w-8 object-contain"
              priority
            />
          ) : (
            <Image
              src="/logo.png"
              alt="BoltRoute"
              width={180}
              height={32}
              className="h-7 w-auto object-contain"
              priority
            />
          )}
        </Link>

        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`
            flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600
            hover:bg-gray-100 transition-colors
            ${isCollapsed ? 'h-6 w-6' : 'h-8 w-8'}
          `}
        >
          <svg
            width={isCollapsed ? 16 : 18}
            height={isCollapsed ? 16 : 18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {isCollapsed ? (
              <path d="M9 18l6-6-6-6" />
            ) : (
              <path d="M11 17l-5-5 5-5M17 17l-5-5 5-5" />
            )}
          </svg>
        </button>
      </div>

      {/* Credits Banner */}
      {!isCollapsed && user?.credits !== undefined && (
        <div className="mx-3 mt-4 p-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">
                Available Credits
              </p>
              <p className="text-xl font-bold text-gray-900">
                {user.credits.toLocaleString()}
              </p>
            </div>
            <Link
              href="/pricing"
              className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              <Icons.Credits />
            </Link>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const Icon = Icons[item.icon];
            const active = isActive(item.href);

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl
                    transition-all duration-200 group relative
                    ${active
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-200'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                >
                  <span className={`flex-shrink-0 ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}>
                    <Icon />
                  </span>

                  {!isCollapsed && (
                    <span className="font-medium text-sm">
                      {item.name}
                    </span>
                  )}

                  {item.badge && !isCollapsed && (
                    <span className={`
                      ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full
                      ${active 
                        ? 'bg-white/20 text-white' 
                        : 'bg-orange-100 text-orange-600'
                      }
                    `}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-100 p-3">
        {/* Logout Button (when collapsed) */}
        {isCollapsed ? (
          <button
            title="Logout"
            className="
              w-full flex items-center justify-center p-2.5 rounded-xl
              text-gray-400 hover:text-red-500 hover:bg-red-50
              transition-all duration-200 group relative
            "
          >
            <Icons.Logout />
          </button>
        ) : (
          <>
            {/* User Profile */}
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="
                w-full flex items-center gap-3 p-2 rounded-xl
                hover:bg-gray-100 transition-colors
              "
            >
              {/* Avatar */}
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name || 'User'}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-100"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold text-sm">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
              
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email || 'user@example.com'}
                </p>
              </div>
              
              <Icons.ChevronDown />
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="mt-2 py-1 bg-white border border-gray-200 rounded-xl shadow-lg">
                <Link
                  href="/account"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Icons.Account />
                  Account Settings
                </Link>
                <hr className="my-1 border-gray-100" />
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Icons.Logout />
                  Logout
                </button>
              </div>
            )}
          </>
        )}
      </div>

    </aside>
  );
}
