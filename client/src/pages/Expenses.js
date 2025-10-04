import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { expensesAPI } from '../services/api';
import { FiPlus, FiSearch, FiEye, FiEdit, FiTrash2, FiDollarSign } from 'react-icons/fi';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });

  useEffect(() => {
    fetchExpenses();
  }, [filters, pagination.current]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        limit: 10,
        ...filters
      };
      const response = await expensesAPI.getExpenses(params);
      setExpenses(response.data.expenses);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await expensesAPI.deleteExpense(id);
        fetchExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      draft: 'status-draft',
      submitted: 'status-submitted',
      pending_manager: 'status-pending',
      pending_finance: 'status-pending',
      pending_director: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      reimbursed: 'status-approved'
    };
    
    return (
      <span className={`badge ${statusClasses[status] || 'status-draft'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-8 w-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Expenses</h1>
          <p className="text-gray-600">Manage and track your expense submissions</p>
        </div>
        <Link
          to="/expenses/submit"
          className="btn btn-primary btn-md"
        >
          <FiPlus className="h-4 w-4 mr-2" />
          Submit Expense
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="input"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="pending_manager">Pending Manager</option>
                <option value="pending_finance">Pending Finance</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="input"
              >
                <option value="">All Categories</option>
                <option value="Travel">Travel</option>
                <option value="Food">Food</option>
                <option value="Stay">Stay</option>
                <option value="Transportation">Transportation</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Training">Training</option>
                <option value="Medical">Medical</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="card">
        <div className="card-content p-0">
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <FiDollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by submitting your first expense.
              </p>
              <div className="mt-6">
                <Link
                  to="/expenses/submit"
                  className="btn btn-primary btn-md"
                >
                  <FiPlus className="h-4 w-4 mr-2" />
                  Submit Expense
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expenses.map((expense) => (
                    <tr key={expense._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {expense.description}
                          </div>
                          {expense.justification && (
                            <div className="text-sm text-gray-500">
                              {expense.justification.substring(0, 50)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{expense.category}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ${expense.amount.toLocaleString()}
                        </div>
                        {expense.originalCurrency !== expense.convertedCurrency && (
                          <div className="text-xs text-gray-500">
                            {expense.originalAmount} {expense.originalCurrency}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(expense.expenseDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(expense.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/expenses/${expense._id}`}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <FiEye className="h-4 w-4" />
                          </Link>
                          {(expense.status === 'draft' || expense.status === 'rejected') && (
                            <>
                              <Link
                                to={`/expenses/${expense._id}`}
                                className="text-yellow-600 hover:text-yellow-900"
                              >
                                <FiEdit className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() => handleDelete(expense._id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <FiTrash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="card-footer">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.current - 1) * 10) + 1} to {Math.min(pagination.current * 10, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                  disabled={pagination.current === 1}
                  className="btn btn-outline btn-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
                  disabled={pagination.current === pagination.pages}
                  className="btn btn-outline btn-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Expenses;
