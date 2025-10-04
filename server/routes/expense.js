const express = require('express');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Company = require('../models/Company');
const { validate } = require('../middleware/validation');
const { expenseValidation } = require('../middleware/validation');
const { authenticateToken, authorize, authorizeCompany } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

// Currency conversion helper
const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  try {
    if (fromCurrency === toCurrency) {
      return { convertedAmount: amount, exchangeRate: 1 };
    }

    // Using exchangerate-api.com (free tier)
    const response = await axios.get(
      `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
    );
    
    const exchangeRate = response.data.rates[toCurrency];
    if (!exchangeRate) {
      throw new Error(`Exchange rate not found for ${toCurrency}`);
    }

    const convertedAmount = amount * exchangeRate;
    return { convertedAmount, exchangeRate };
  } catch (error) {
    console.error('Currency conversion error:', error);
    throw new Error('Currency conversion failed');
  }
};

// @route   POST /api/expenses
// @desc    Create a new expense
// @access  Private
router.post('/', authenticateToken, validate(expenseValidation.create), async (req, res) => {
  try {
    const {
      amount,
      originalCurrency,
      category,
      subCategory,
      description,
      justification,
      expenseDate,
      tags,
      isUrgent,
      projectCode,
      clientCode,
      location
    } = req.body;

    // Get company currency
    const company = await Company.findById(req.user.company);
    if (!company) {
      return res.status(400).json({
        message: 'Company not found',
        code: 'COMPANY_NOT_FOUND'
      });
    }

    // Convert currency
    const { convertedAmount, exchangeRate } = await convertCurrency(
      amount,
      originalCurrency,
      company.currency
    );

    // Create expense
    const expense = new Expense({
      employee: req.user._id,
      company: req.user.company,
      amount: convertedAmount,
      originalAmount: amount,
      originalCurrency,
      convertedAmount,
      convertedCurrency: company.currency,
      exchangeRate,
      category,
      subCategory,
      description,
      justification,
      expenseDate,
      tags,
      isUrgent,
      projectCode,
      clientCode,
      location,
      status: 'draft'
    });

    await expense.save();

    // Populate the expense
    const populatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'firstName lastName email')
      .populate('company', 'name country currency');

    res.status(201).json({
      message: 'Expense created successfully',
      expense: populatedExpense
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      message: 'Failed to create expense',
      error: error.message
    });
  }
});

// @route   GET /api/expenses
// @desc    Get all expenses (with filters)
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      employee,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      search
    } = req.query;

    const skip = (page - 1) * limit;
    let filter = {};

    // Apply company filter for non-admin users
    if (req.user.role !== 'admin') {
      filter.company = req.user.company;
    }

    // Apply other filters
    if (status) {
      filter.status = status;
    }
    if (category) {
      filter.category = category;
    }
    if (employee) {
      filter.employee = employee;
    }
    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) filter.expenseDate.$lte = new Date(endDate);
    }
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = parseFloat(minAmount);
      if (maxAmount) filter.amount.$lte = parseFloat(maxAmount);
    }
    if (search) {
      filter.$or = [
        { description: new RegExp(search, 'i') },
        { justification: new RegExp(search, 'i') },
        { 'employee.firstName': new RegExp(search, 'i') },
        { 'employee.lastName': new RegExp(search, 'i') }
      ];
    }

    const expenses = await Expense.find(filter)
      .populate('employee', 'firstName lastName email department')
      .populate('company', 'name country currency')
      .populate('currentApprover', 'firstName lastName email')
      .sort({ expenseDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Expense.countDocuments(filter);

    res.json({
      message: 'Expenses retrieved successfully',
      expenses,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      message: 'Failed to retrieve expenses',
      error: error.message
    });
  }
});

// @route   GET /api/expenses/:id
// @desc    Get expense by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('employee', 'firstName lastName email department position')
      .populate('company', 'name country currency')
      .populate('currentApprover', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .populate('reimbursedBy', 'firstName lastName email');

    if (!expense) {
      return res.status(404).json({
        message: 'Expense not found',
        code: 'EXPENSE_NOT_FOUND'
      });
    }

    // Check if user can access this expense
    if (req.user.role !== 'admin' && 
        req.user.company.toString() !== expense.company._id.toString() &&
        req.user._id.toString() !== expense.employee._id.toString()) {
      return res.status(403).json({
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    res.json({
      message: 'Expense retrieved successfully',
      expense
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      message: 'Failed to retrieve expense',
      error: error.message
    });
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update expense
// @access  Private
router.put('/:id', authenticateToken, validate(expenseValidation.update), async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        message: 'Expense not found',
        code: 'EXPENSE_NOT_FOUND'
      });
    }

    // Check if user can update this expense
    if (req.user.role !== 'admin' && 
        req.user._id.toString() !== expense.employee.toString()) {
      return res.status(403).json({
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Check if expense can be updated
    if (expense.status !== 'draft' && expense.status !== 'rejected') {
      return res.status(400).json({
        message: 'Expense cannot be updated in current status',
        code: 'EXPENSE_LOCKED'
      });
    }

    // Update expense
    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('employee', 'firstName lastName email')
    .populate('company', 'name country currency');

    res.json({
      message: 'Expense updated successfully',
      expense: updatedExpense
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      message: 'Failed to update expense',
      error: error.message
    });
  }
});

// @route   POST /api/expenses/:id/submit
// @desc    Submit expense for approval
// @access  Private
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        message: 'Expense not found',
        code: 'EXPENSE_NOT_FOUND'
      });
    }

    // Check if user can submit this expense
    if (req.user.role !== 'admin' && 
        req.user._id.toString() !== expense.employee.toString()) {
      return res.status(403).json({
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Check if expense can be submitted
    if (expense.status !== 'draft') {
      return res.status(400).json({
        message: 'Expense cannot be submitted in current status',
        code: 'INVALID_STATUS'
      });
    }

    // Get company settings
    const company = await Company.findById(expense.company);
    const autoApprovalLimit = company.settings.autoApprovalLimit || 100;

    // Check if auto-approval applies
    if (expense.amount <= autoApprovalLimit) {
      expense.status = 'approved';
      expense.approvedBy = req.user._id;
      expense.approvedAt = new Date();
    } else {
      // Set up approval workflow
      expense.status = 'pending_manager';
      
      // Find manager
      const employee = await User.findById(expense.employee);
      if (employee.manager) {
        expense.currentApprover = employee.manager;
        
        // Create approval record
        const Approval = require('../models/Approval');
        const approval = new Approval({
          expense: expense._id,
          approver: employee.manager,
          role: 'manager',
          status: 'pending'
        });
        await approval.save();
      } else {
        // No manager, go to finance
        expense.status = 'pending_finance';
        // Find finance users
        const financeUsers = await User.find({ 
          company: expense.company, 
          role: 'finance',
          isActive: true 
        });
        
        if (financeUsers.length > 0) {
          expense.currentApprover = financeUsers[0]._id;
          
          const Approval = require('../models/Approval');
          const approval = new Approval({
            expense: expense._id,
            approver: financeUsers[0]._id,
            role: 'finance',
            status: 'pending'
          });
          await approval.save();
        }
      }
    }

    await expense.save();

    res.json({
      message: 'Expense submitted successfully',
      expense
    });
  } catch (error) {
    console.error('Submit expense error:', error);
    res.status(500).json({
      message: 'Failed to submit expense',
      error: error.message
    });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete expense
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        message: 'Expense not found',
        code: 'EXPENSE_NOT_FOUND'
      });
    }

    // Check if user can delete this expense
    if (req.user.role !== 'admin' && 
        req.user._id.toString() !== expense.employee.toString()) {
      return res.status(403).json({
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Check if expense can be deleted
    if (expense.status !== 'draft') {
      return res.status(400).json({
        message: 'Expense cannot be deleted in current status',
        code: 'EXPENSE_LOCKED'
      });
    }

    await Expense.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      message: 'Failed to delete expense',
      error: error.message
    });
  }
});

// @route   GET /api/expenses/stats/summary
// @desc    Get expense statistics
// @access  Private
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, employee } = req.query;
    let filter = {};

    // Apply company filter for non-admin users
    if (req.user.role !== 'admin') {
      filter.company = req.user.company;
    }

    // Apply other filters
    if (employee) {
      filter.employee = employee;
    }
    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) filter.expenseDate.$lte = new Date(endDate);
    }

    const stats = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const categoryStats = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      message: 'Expense statistics retrieved successfully',
      stats: {
        byStatus: stats,
        byCategory: categoryStats
      }
    });
  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({
      message: 'Failed to retrieve expense statistics',
      error: error.message
    });
  }
});

module.exports = router;
