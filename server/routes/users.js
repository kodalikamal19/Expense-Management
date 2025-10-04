const express = require('express');
const User = require('../models/User');
const Company = require('../models/Company');
const { validate } = require('../middleware/validation');
const { userValidation } = require('../middleware/validation');
const { authenticateToken, authorize, authorizeCompany, authorizeUserManagement } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (with filters)
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      role, 
      department, 
      search, 
      company,
      isActive = true 
    } = req.query;
    
    const skip = (page - 1) * limit;
    let filter = { isActive };

    // Apply company filter
    if (company) {
      filter.company = company;
    } else if (req.user.role !== 'admin') {
      // Non-admin users can only see users from their company
      filter.company = req.user.company;
    }

    // Apply other filters
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
      .populate('company', 'name country currency')
      .populate('manager', 'firstName lastName email')
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      message: 'Users retrieved successfully',
      users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      message: 'Failed to retrieve users',
      error: error.message
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('company', 'name country currency')
      .populate('manager', 'firstName lastName email')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user can access this profile
    if (req.user.role !== 'admin' && 
        req.user.company.toString() !== user.company._id.toString() &&
        req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    res.json({
      message: 'User retrieved successfully',
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      message: 'Failed to retrieve user',
      error: error.message
    });
  }
});

// @route   POST /api/users
// @desc    Create a new user
// @access  Private (Admin or Manager)
router.post('/', authenticateToken, authorize('admin', 'manager'), validate(userValidation.register), async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, company, manager, department, position, phoneNumber, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists with this email',
        code: 'USER_EXISTS'
      });
    }

    // Verify company exists
    const companyExists = await Company.findById(company);
    if (!companyExists) {
      return res.status(400).json({
        message: 'Company not found',
        code: 'COMPANY_NOT_FOUND'
      });
    }

    // Verify manager exists if provided
    if (manager) {
      const managerExists = await User.findById(manager);
      if (!managerExists || managerExists.company.toString() !== company) {
        return res.status(400).json({
          message: 'Manager not found or not in the same company',
          code: 'MANAGER_NOT_FOUND'
        });
      }
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      role,
      company,
      manager,
      department,
      position,
      phoneNumber,
      address
    });

    await user.save();

    // Populate the created user
    const populatedUser = await User.findById(user._id)
      .populate('company', 'name country currency')
      .populate('manager', 'firstName lastName email')
      .select('-password');

    res.status(201).json({
      message: 'User created successfully',
      user: populatedUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      message: 'Failed to create user',
      error: error.message
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin or Manager or Self)
router.put('/:id', authenticateToken, authorizeUserManagement, validate(userValidation.update), async (req, res) => {
  try {
    const userId = req.params.id;
    const isSelf = req.user._id.toString() === userId;

    // Check permissions
    if (!isSelf && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        message: 'Insufficient permissions to update user',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // If updating self, restrict certain fields
    const allowedUpdates = isSelf 
      ? ['firstName', 'lastName', 'department', 'position', 'phoneNumber', 'address', 'preferences']
      : ['firstName', 'lastName', 'role', 'department', 'position', 'phoneNumber', 'address', 'isActive', 'manager'];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    )
    .populate('company', 'name country currency')
    .populate('manager', 'firstName lastName email')
    .select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      message: 'Failed to update user',
      error: error.message
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (soft delete)
// @access  Private (Admin or Manager)
router.delete('/:id', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

// @route   GET /api/users/:id/employees
// @desc    Get employees under a manager
// @access  Private
router.get('/:id/employees', authenticateToken, async (req, res) => {
  try {
    const managerId = req.params.id;

    // Check if user can access this manager's employees
    if (req.user.role !== 'admin' && 
        req.user._id.toString() !== managerId &&
        req.user.manager && 
        req.user.manager.toString() !== managerId) {
      return res.status(403).json({
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    const employees = await User.find({ 
      manager: managerId, 
      isActive: true 
    })
    .populate('company', 'name country currency')
    .select('-password')
    .sort({ firstName: 1, lastName: 1 });

    res.json({
      message: 'Employees retrieved successfully',
      employees
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      message: 'Failed to retrieve employees',
      error: error.message
    });
  }
});

// @route   GET /api/users/:id/expenses
// @desc    Get user's expenses
// @access  Private
router.get('/:id/expenses', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const { page = 1, limit = 10, status, category, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    // Check if user can access this user's expenses
    if (req.user.role !== 'admin' && 
        req.user._id.toString() !== userId &&
        req.user.manager && 
        req.user.manager.toString() !== userId) {
      return res.status(403).json({
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    let filter = { employee: userId };

    // Apply filters
    if (status) {
      filter.status = status;
    }
    if (category) {
      filter.category = category;
    }
    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) filter.expenseDate.$lte = new Date(endDate);
    }

    const Expense = require('../models/Expense');
    const expenses = await Expense.find(filter)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email')
      .sort({ expenseDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Expense.countDocuments(filter);

    res.json({
      message: 'User expenses retrieved successfully',
      expenses,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get user expenses error:', error);
    res.status(500).json({
      message: 'Failed to retrieve user expenses',
      error: error.message
    });
  }
});

// @route   PUT /api/users/:id/activate
// @desc    Activate/deactivate user
// @access  Private (Admin or Manager)
router.put('/:id/activate', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    )
    .populate('company', 'name country currency')
    .populate('manager', 'firstName lastName email')
    .select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      message: 'Failed to toggle user status',
      error: error.message
    });
  }
});

module.exports = router;
