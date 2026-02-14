/**
 * DashboardLayout - Layout principal réutilisable pour tous les dashboards
 * Gère la navigation, le header, la sidebar et le responsive
 */

import React, { useState, useEffect } from 'react';
import { 
  Menu, X, Bell, User, Search, ChevronDown, 
  LogOut, Settings, HelpCircle, Home
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useNotifications } from '../../../hooks/useNotifications';

const DashboardLayout = ({ 
  children, 
  title = 'Dashboard',
  subtitle,
  breadcrumbs = [],
  showSearch = true,
  showNotifications = true,
  sidebarItems = [],
  headerActions,
  className = ''
}) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Détecter le changement de taille d'écran
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fermer les menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileMenuOpen && !event.target.closest('.profile-menu')) {
        setIsProfileMenuOpen(false);
      }
      if (isNotificationsOpen && !event.target.closest('.notifications-menu')) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileMenuOpen, isNotificationsOpen]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const getUserInitials = () => {
    if (!user) return 'U';
    const names = (user.name || user.email || 'User').split(' ');
    return names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUserRoleColor = () => {
    const roleColors = {
      admin: 'from-purple-500 to-purple-600',
      'couple:owner': 'from-pink-500 to-rose-600',
      'couple:partner': 'from-pink-500 to-rose-600',
      'vendor:dj': 'from-blue-500 to-indigo-600',
      'vendor:photographer': 'from-green-500 to-emerald-600',
      'vendor:caterer': 'from-orange-500 to-red-600',
      'wedding:planner': 'from-purple-500 to-pink-600',
      guest: 'from-gray-500 to-gray-600'
    };
    return roleColors[user?.role] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Gauche: Menu + Titre */}
            <div className="flex items-center">
              {isMobile && (
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                >
                  <Menu className="h-6 w-6" />
                </button>
              )}
              
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-gray-500">{subtitle}</p>
                )}
              </div>
            </div>

            {/* Centre: Recherche (desktop) */}
            {showSearch && !isMobile && (
              <div className="flex-1 max-w-md mx-8">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Rechercher..."
                  />
                </div>
              </div>
            )}

            {/* Droite: Actions + Profil */}
            <div className="flex items-center space-x-4">
              {/* Actions personnalisées */}
              {headerActions}

              {/* Notifications */}
              {showNotifications && (
                <div className="relative notifications-menu">
                  <button
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="p-2 text-gray-400 hover:text-gray-500 relative"
                  >
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
                    )}
                  </button>

                  {/* Dropdown Notifications */}
                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg py-1 z-50">
                      <div className="px-4 py-2 border-b">
                        <h3 className="text-sm font-semibold">Notifications</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-gray-500">
                            Aucune notification
                          </p>
                        ) : (
                          notifications.slice(0, 5).map((notif) => (
                            <div
                              key={notif.id}
                              className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${
                                !notif.read ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => markAsRead(notif.id)}
                            >
                              <p className="text-sm font-medium text-gray-900">
                                {notif.title}
                              </p>
                              <p className="text-sm text-gray-500">
                                {notif.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {notif.time}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="px-4 py-2 border-t">
                        <button className="text-sm text-blue-600 hover:text-blue-700">
                          Voir toutes les notifications
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Menu Profil */}
              <div className="relative profile-menu">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getUserRoleColor()} flex items-center justify-center text-white font-medium text-sm`}>
                    {getUserInitials()}
                  </div>
                  {!isMobile && (
                    <>
                      <span className="text-sm font-medium text-gray-700">
                        {user?.name || user?.email}
                      </span>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </>
                  )}
                </button>

                {/* Dropdown Menu Profil */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.name || user?.email}
                      </p>
                      <p className="text-xs text-gray-500">{user?.role}</p>
                    </div>
                    
                    <a
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <User className="inline h-4 w-4 mr-2" />
                      Mon Profil
                    </a>
                    
                    <a
                      href="/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Settings className="inline h-4 w-4 mr-2" />
                      Paramètres
                    </a>
                    
                    <a
                      href="/help"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <HelpCircle className="inline h-4 w-4 mr-2" />
                      Aide
                    </a>
                    
                    <hr className="my-1" />
                    
                    <button
                      onClick={logout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="inline h-4 w-4 mr-2" />
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <div className="bg-gray-50 px-4 sm:px-6 lg:px-8 py-2">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                <li>
                  <a href="/dashboard" className="text-gray-400 hover:text-gray-500">
                    <Home className="h-4 w-4" />
                  </a>
                </li>
                {breadcrumbs.map((crumb, index) => (
                  <li key={index} className="flex items-center">
                    <svg
                      className="flex-shrink-0 h-5 w-5 text-gray-300"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                    </svg>
                    {crumb.href ? (
                      <a
                        href={crumb.href}
                        className="ml-2 text-sm font-medium text-gray-500 hover:text-gray-700"
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        {crumb.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        )}
      </header>

      {/* Sidebar Mobile */}
      {isMobile && (
        <>
          {/* Overlay */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40"
              onClick={toggleSidebar}
            />
          )}

          {/* Sidebar */}
          <div
            className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between h-16 px-4 border-b">
              <h2 className="text-lg font-semibold">Menu</h2>
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="px-4 py-4">
              {sidebarItems.map((item, index) => (
                <a
                  key={index}
                  href={item.href}
                  className={`flex items-center px-3 py-2 mb-1 text-sm font-medium rounded-md transition-colors ${
                    item.active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.icon && <item.icon className="mr-3 h-5 w-5" />}
                  {item.label}
                  {item.badge && (
                    <span className="ml-auto bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                      {item.badge}
                    </span>
                  )}
                </a>
              ))}
            </nav>
          </div>
        </>
      )}

      {/* Sidebar Desktop */}
      {!isMobile && sidebarItems.length > 0 && (
        <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <nav className="px-4 py-4">
            {sidebarItems.map((item, index) => (
              <a
                key={index}
                href={item.href}
                className={`flex items-center px-3 py-2 mb-1 text-sm font-medium rounded-md transition-colors ${
                  item.active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {item.icon && <item.icon className="mr-3 h-5 w-5" />}
                {item.label}
                {item.badge && (
                  <span className="ml-auto bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                    {item.badge}
                  </span>
                )}
              </a>
            ))}
          </nav>
        </aside>
      )}

      {/* Main Content */}
      <main
        className={`${className} ${
          !isMobile && sidebarItems.length > 0 ? 'ml-64' : ''
        } mt-16 ${breadcrumbs.length > 0 ? 'mt-24' : ''}`}
      >
        <div className="py-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;