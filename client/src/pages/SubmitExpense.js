import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { expensesAPI, ocrAPI } from '../services/api';
import { FiUpload, FiX, FiDollarSign, FiCalendar, FiTag } from 'react-icons/fi';
import toast from 'react-hot-toast';

const SubmitExpense = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    amount: '',
    originalCurrency: 'USD',
    category: '',
    description: '',
    justification: '',
    expenseDate: new Date().toISOString().split('T')[0],
    tags: [],
    isUrgent: false,
    projectCode: '',
    clientCode: ''
  });
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    if (id) {
      setIsEdit(true);
      fetchExpense();
    }
  }, [id]);

  const fetchExpense = async () => {
    try {
      const response = await expensesAPI.getExpense(id);
      const expense = response.data.expense;
      setFormData({
        amount: expense.amount,
        originalCurrency: expense.originalCurrency,
        category: expense.category,
        description: expense.description,
        justification: expense.justification || '',
        expenseDate: new Date(expense.expenseDate).toISOString().split('T')[0],
        tags: expense.tags || [],
        isUrgent: expense.isUrgent || false,
        projectCode: expense.projectCode || '',
        clientCode: expense.clientCode || ''
      });
      setReceipts(expense.receipts || []);
    } catch (error) {
      console.error('Error fetching expense:', error);
      toast.error('Failed to load expense');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleReceiptUpload = async (e) => {
    const files = Array.from(e.target.files);
    setLoading(true);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('receipt', file);

        const response = await ocrAPI.extractText(formData);
        const { parsedData } = response.data;

        // Auto-fill form if OCR data is available
        if (parsedData.amount && !formData.amount) {
          setFormData(prev => ({ ...prev, amount: parsedData.amount }));
        }
        if (parsedData.category && !formData.category) {
          setFormData(prev => ({ ...prev, category: parsedData.category }));
        }
        if (parsedData.merchantName && !formData.description) {
          setFormData(prev => ({ ...prev, description: parsedData.merchantName }));
        }
        if (parsedData.date && !formData.expenseDate) {
          setFormData(prev => ({ ...prev, expenseDate: new Date(parsedData.date).toISOString().split('T')[0] }));
        }

        setReceipts(prev => [...prev, {
          filename: file.name,
          size: file.size,
          mimeType: file.type,
          ocrData: parsedData
        }]);
      }
      toast.success('Receipts processed successfully');
    } catch (error) {
      console.error('OCR processing error:', error);
      toast.error('Failed to process receipts');
    } finally {
      setLoading(false);
    }
  };

  const removeReceipt = (index) => {
    setReceipts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        receipts
      };

      if (isEdit) {
        await expensesAPI.updateExpense(id, expenseData);
        toast.success('Expense updated successfully');
      } else {
        await expensesAPI.createExpense(expenseData);
        toast.success('Expense created successfully');
      }

        navigate('/expenses');
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Expense' : 'Submit New Expense'}
        </h1>
        <p className="text-gray-600">
          {isEdit ? 'Update your expense details' : 'Fill in the details for your expense claim'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Expense Details</h3>
            <p className="card-description">Basic information about your expense</p>
          </div>
          <div className="card-content space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount *
                </label>
                <div className="relative">
                  <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    required
                    value={formData.amount}
                    onChange={handleChange}
                    className="input pl-10"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  name="originalCurrency"
                  value={formData.originalCurrency}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="input"
              >
                <option value="">Select category</option>
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
                Description *
              </label>
              <textarea
                name="description"
                required
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="input"
                placeholder="Describe your expense..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Justification
              </label>
              <textarea
                name="justification"
                rows={3}
                value={formData.justification}
                onChange={handleChange}
                className="input"
                placeholder="Why is this expense necessary? (Optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expense Date *
                </label>
                <div className="relative">
                  <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    name="expenseDate"
                    required
                    value={formData.expenseDate}
                    onChange={handleChange}
                    className="input pl-10"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isUrgent"
                  checked={formData.isUrgent}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Mark as urgent
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Receipts */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Receipts</h3>
            <p className="card-description">Upload receipts for your expense</p>
          </div>
          <div className="card-content">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="receipt-upload" className="btn btn-primary btn-md cursor-pointer">
                    <FiUpload className="h-4 w-4 mr-2" />
                    Upload Receipts
                  </label>
                  <input
                    id="receipt-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    className="hidden"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  PNG, JPG, GIF up to 10MB each
                </p>
              </div>
            </div>

            {receipts.length > 0 && (
              <div className="mt-4 space-y-2">
                {receipts.map((receipt, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <FiDollarSign className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{receipt.filename}</p>
                        <p className="text-xs text-gray-500">
                          {(receipt.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeReceipt(index)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/expenses')}
            className="btn btn-outline btn-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-md"
          >
            {loading ? (
              <div className="loading-spinner h-4 w-4 mr-2"></div>
            ) : null}
            {isEdit ? 'Update Expense' : 'Create Expense'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubmitExpense;
