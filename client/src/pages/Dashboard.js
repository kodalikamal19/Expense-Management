import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { reportsAPI } from '../services/api';
import {
  FiDollarSign,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiTrendingUp,
  FiUsers,
  FiAlertCircle
} from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await reportsAPI.getDashboardData();
        setDashboardData(response.data.dashboard);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-8 w-8"></div>
      </div>
    );
  }

  const stats = dashboardData?.expenses || {};
  const statusBreakdown = dashboardData?.statusBreakdown || [];
  const categoryBreakdown = dashboardData?.categoryBreakdown || [];
  const recentExpenses = dashboardData?.recentExpenses || [];
  const approvals = dashboardData?.approvals || {};
  const overdueApprovals = dashboardData?.overdueApprovals || 0;

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  const StatCard = ({ title, value, icon: Icon, color, change }) => (
    <div className="card">
      <div className="card-content">
        <div className="flex items-center">
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {change && (
              <p className={`text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change > 0 ? '+' : ''}{change}% from last month
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your expenses today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Expenses"
          value={`$${stats.totalAmount?.toLocaleString() || '0'}`}
          icon={FiDollarSign}
          color="bg-blue-500"
        />
        <StatCard
          title="Approved"
          value={stats.approvedAmount ? `$${stats.approvedAmount.toLocaleString()}` : '$0'}
          icon={FiCheckCircle}
          color="bg-green-500"
        />
        <StatCard
          title="Pending"
          value={stats.pendingAmount ? `$${stats.pendingAmount.toLocaleString()}` : '$0'}
          icon={FiClock}
          color="bg-yellow-500"
        />
        <StatCard
          title="Rejected"
          value={stats.rejectedAmount ? `$${stats.rejectedAmount.toLocaleString()}` : '$0'}
          icon={FiXCircle}
          color="bg-red-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Expenses by Status</h3>
            <p className="card-description">Distribution of expenses by approval status</p>
          </div>
          <div className="card-content">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="totalAmount"
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Expenses by Category</h3>
            <p className="card-description">Top expense categories</p>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              {categoryBreakdown.slice(0, 5).map((category, index) => (
                <div key={category._id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {category._id}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      ${category.totalAmount?.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">{category.count} expenses</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Expenses and Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Expenses */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Expenses</h3>
            <p className="card-description">Your latest expense submissions</p>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              {recentExpenses.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No recent expenses
                </p>
              ) : (
                recentExpenses.map((expense) => (
                  <div key={expense._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <FiDollarSign className="h-5 w-5 text-primary-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {expense.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {expense.category} • {new Date(expense.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        ${expense.amount.toLocaleString()}
                      </p>
                      <span className={`badge ${
                        expense.status === 'approved' ? 'status-approved' :
                        expense.status === 'rejected' ? 'status-rejected' :
                        expense.status === 'pending_manager' || expense.status === 'pending_finance' ? 'status-pending' :
                        'status-draft'
                      }`}>
                        {expense.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Approvals Summary */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Approvals Summary</h3>
            <p className="card-description">Your approval activity</p>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <FiCheckCircle className="h-5 w-5 text-green-600" />
                  <span className="ml-2 text-sm font-medium text-gray-900">Approved</span>
                </div>
                <span className="text-sm font-semibold text-green-600">
                  {approvals.approved || 0}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center">
                  <FiClock className="h-5 w-5 text-yellow-600" />
                  <span className="ml-2 text-sm font-medium text-gray-900">Pending</span>
                </div>
                <span className="text-sm font-semibold text-yellow-600">
                  {approvals.pending || 0}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center">
                  <FiXCircle className="h-5 w-5 text-red-600" />
                  <span className="ml-2 text-sm font-medium text-gray-900">Rejected</span>
                </div>
                <span className="text-sm font-semibold text-red-600">
                  {approvals.rejected || 0}
                </span>
              </div>

              {overdueApprovals > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <FiAlertCircle className="h-5 w-5 text-red-600" />
                    <span className="ml-2 text-sm font-medium text-gray-900">Overdue</span>
                  </div>
                  <span className="text-sm font-semibold text-red-600">
                    {overdueApprovals}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
