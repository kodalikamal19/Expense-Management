const express = require('express');
const Company = require('../models/Company');
const User = require('../models/User');
const { validate } = require('../middleware/validation');
const { companyValidation } = require('../middleware/validation');
const { authenticateToken, authorize, authorizeCompany } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/company
// @desc    Create a new company
// @access  Private (Admin only)
router.post('/', authenticateToken, authorize('admin'), validate(companyValidation.create), async (req, res) => {
  try {
    const companyData = {
      ...req.body,
      createdBy: req.user._id
    };

    const company = new Company(companyData);
    await company.save();

    res.status(201).json({
      message: 'Company created successfully',
      company
    });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({
      message: 'Failed to create company',
      error: error.message
    });
  }
});

// @route   GET /api/company
// @desc    Get all companies (admin) or user's company
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    let companies;

    if (req.user.role === 'admin') {
      // Admin can see all companies
      companies = await Company.find({ isActive: true })
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 });
    } else {
      // Regular users can only see their company
      companies = await Company.find({ 
        _id: req.user.company, 
        isActive: true 
      }).populate('createdBy', 'firstName lastName email');
    }

    res.json({
      message: 'Companies retrieved successfully',
      companies
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      message: 'Failed to retrieve companies',
      error: error.message
    });
  }
});

// @route   GET /api/company/:id
// @desc    Get company by ID
// @access  Private
router.get('/:id', authenticateToken, authorizeCompany, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email');

    if (!company) {
      return res.status(404).json({
        message: 'Company not found',
        code: 'COMPANY_NOT_FOUND'
      });
    }

    res.json({
      message: 'Company retrieved successfully',
      company
    });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      message: 'Failed to retrieve company',
      error: error.message
    });
  }
});

// @route   PUT /api/company/:id
// @desc    Update company
// @access  Private (Admin or Company Admin)
router.put('/:id', authenticateToken, authorizeCompany, validate(companyValidation.update), async (req, res) => {
  try {
    // Check if user has permission to update company
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        message: 'Insufficient permissions to update company',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!company) {
      return res.status(404).json({
        message: 'Company not found',
        code: 'COMPANY_NOT_FOUND'
      });
    }

    res.json({
      message: 'Company updated successfully',
      company
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({
      message: 'Failed to update company',
      error: error.message
    });
  }
});

// @route   DELETE /api/company/:id
// @desc    Delete company (soft delete)
// @access  Private (Admin only)
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({
        message: 'Company not found',
        code: 'COMPANY_NOT_FOUND'
      });
    }

    // Deactivate all users in this company
    await User.updateMany(
      { company: req.params.id },
      { isActive: false }
    );

    res.json({
      message: 'Company deactivated successfully'
    });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({
      message: 'Failed to delete company',
      error: error.message
    });
  }
});

// @route   GET /api/company/:id/users
// @desc    Get all users in a company
// @access  Private
router.get('/:id/users', authenticateToken, authorizeCompany, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, department, search } = req.query;
    const skip = (page - 1) * limit;

    let filter = { company: req.params.id, isActive: true };

    // Apply filters
    if (role) {
      filter.role = role;
    }
    if (department) {
      filter.department = new RegExp(department, 'i');
    }
    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    const users = await User.find(filter)
      .populate('manager', 'firstName lastName email')
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      message: 'Company users retrieved successfully',
      users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get company users error:', error);
    res.status(500).json({
      message: 'Failed to retrieve company users',
      error: error.message
    });
  }
});

// @route   GET /api/company/:id/stats
// @desc    Get company statistics
// @access  Private
router.get('/:id/stats', authenticateToken, authorizeCompany, async (req, res) => {
  try {
    const companyId = req.params.id;

    // Get user counts by role
    const userStats = await User.aggregate([
      { $match: { company: companyId, isActive: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Get expense statistics
    const Expense = require('../models/Expense');
    const expenseStats = await Expense.aggregate([
      { $match: { company: companyId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Get recent activity
    const recentExpenses = await Expense.find({ company: companyId })
      .populate('employee', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('amount category status createdAt employee');

    res.json({
      message: 'Company statistics retrieved successfully',
      stats: {
        users: userStats,
        expenses: expenseStats,
        recentActivity: recentExpenses
      }
    });
  } catch (error) {
    console.error('Get company stats error:', error);
    res.status(500).json({
      message: 'Failed to retrieve company statistics',
      error: error.message
    });
  }
});

// @route   PUT /api/company/:id/settings
// @desc    Update company settings
// @access  Private (Admin or Manager)
router.put('/:id/settings', authenticateToken, authorizeCompany, async (req, res) => {
  try {
    // Check if user has permission to update settings
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        message: 'Insufficient permissions to update company settings',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const { settings } = req.body;

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { $set: { settings } },
      { new: true, runValidators: true }
    );

    if (!company) {
      return res.status(404).json({
        message: 'Company not found',
        code: 'COMPANY_NOT_FOUND'
      });
    }

    res.json({
      message: 'Company settings updated successfully',
      settings: company.settings
    });
  } catch (error) {
    console.error('Update company settings error:', error);
    res.status(500).json({
      message: 'Failed to update company settings',
      error: error.message
    });
  }
});

module.exports = router;
