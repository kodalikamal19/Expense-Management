import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  FiHome,
  FiDollarSign,
  FiPlus,
  FiCheckCircle,
  FiBarChart,
  FiUsers,
  FiBriefcase,
  FiSettings,
  FiX
} from 'react-icons/fi';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/app/dashboard',
      icon: FiHome,
      roles: ['admin', 'manager', 'employee', 'finance']
    },
    {
      name: 'My Expenses',
      href: '/app/expenses',
      icon: FiDollarSign,
      roles: ['admin', 'manager', 'employee', 'finance']
    },
    {
      name: 'Submit Expense',
      href: '/app/expenses/submit',
      icon: FiPlus,
      roles: ['admin', 'manager', 'employee']
    },
    {
      name: 'Approvals',
      href: '/app/approvals',
      icon: FiCheckCircle,
      roles: ['admin', 'manager', 'finance']
    },
    {
      name: 'Reports',
      href: '/app/reports',
      icon: FiBarChart,
      roles: ['admin', 'manager', 'finance']
    },
    {
      name: 'Users',
      href: '/app/admin/users',
      icon: FiUsers,
      roles: ['admin', 'manager']
    },
    {
      name: 'Companies',
      href: '/app/admin/companies',
      icon: FiBriefcase,
      roles: ['admin']
    },
    {
      name: 'Settings',
      href: '/app/settings',
      icon: FiSettings,
      roles: ['admin', 'manager', 'employee', 'finance']
    }
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role)
  );

  const NavItem = ({ item }) => {
    const isActive = location.pathname === item.href;
    
    return (
      <NavLink
        to={item.href}
        onClick={onClose}
        className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          isActive
            ? 'bg-primary-100 text-primary-700'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <item.icon
          className={`mr-3 h-5 w-5 flex-shrink-0 ${
            isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
          }`}
        />
        {item.name}
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <FiDollarSign className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-lg font-semibold text-gray-900">
                ExpenseApp
              </span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </nav>

          {/* User info */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
