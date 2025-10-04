const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const { validate } = require('../middleware/validation');
const { userValidation } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );

  return { accessToken, refreshToken };
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public (for admin only in production)
router.post('/register', async (req, res) => {
  try {
    console.log('Registration request body:', req.body);
    const { email, password, firstName, lastName, role, company, manager, department, position, phoneNumber, address } = req.body;

    // Basic validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        message: 'Missing required fields',
        errors: [
          { field: 'email', message: !email ? 'Email is required' : null },
          { field: 'password', message: !password ? 'Password is required' : null },
          { field: 'firstName', message: !firstName ? 'First name is required' : null },
          { field: 'lastName', message: !lastName ? 'Last name is required' : null }
        ].filter(err => err.message)
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists with this email',
        code: 'USER_EXISTS'
      });
    }

    console.log('User does not exist, proceeding with registration...');

    let companyId = company;

    // Auto-create company if needed (for first admin user)
    if (company === 'auto-create' || !company) {
      console.log('Auto-creating company...');
      // Check if this is the first user
      const userCount = await User.countDocuments();
      console.log('Current user count:', userCount);
      
      if (userCount === 0) {
        console.log('Creating default company...');
        // Create default company for first user
        const defaultCompany = new Company({
          name: `${firstName} ${lastName}'s Company`,
          country: 'US', // Default country
          currency: 'USD', // Default currency
          createdBy: null // Will be updated after user creation
        });
        
        await defaultCompany.save();
        companyId = defaultCompany._id;
        console.log('Company created with ID:', companyId);
        
        // Update the company with the creator
        // defaultCompany.createdBy = null; // Will be updated after user creation
        // await defaultCompany.save();
      } else {
        return res.status(400).json({
          message: 'No company selected and not the first user',
          code: 'COMPANY_REQUIRED'
        });
      }
    } else {
      // Verify company exists
      const companyExists = await Company.findById(company);
      if (!companyExists) {
        return res.status(400).json({
          message: 'Company not found',
          code: 'COMPANY_NOT_FOUND'
        });
      }
    }

    // Verify manager exists if provided
    if (manager) {
      const managerExists = await User.findById(manager);
      if (!managerExists || managerExists.company.toString() !== companyId) {
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
      role: role || 'admin', // First user is admin by default
      company: companyId,
      manager,
      department,
      position,
      phoneNumber,
      address
    });

    await user.save();

    // Update company's createdBy field if this is the first user
    if (company === 'auto-create') {
      await Company.findByIdAndUpdate(companyId, { createdBy: user._id });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        company: user.company,
        manager: user.manager,
        department: user.department,
        position: user.position,
        isActive: user.isActive,
        createdAt: user.createdAt
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'Registration failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validate(userValidation.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        message: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        company: user.company,
        manager: user.manager,
        department: user.department,
        position: user.position,
        isActive: user.isActive,
        lastLogin: user.lastLogin
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Login failed',
      error: error.message
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        message: 'Refresh token required',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    res.json({
      message: 'Token refreshed successfully',
      tokens: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Refresh token expired',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }
    res.status(500).json({
      message: 'Token refresh failed',
      error: error.message
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('company', 'name country currency')
      .populate('manager', 'firstName lastName email');

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      message: 'User profile retrieved successfully',
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Failed to retrieve user profile',
      error: error.message
    });
  }
});

// @route   PUT /api/auth/me
// @desc    Update current user profile
// @access  Private
router.put('/me', authenticateToken, validate(userValidation.update), async (req, res) => {
  try {
    const allowedUpdates = ['firstName', 'lastName', 'department', 'position', 'phoneNumber', 'address', 'preferences'];
    const updates = {};

    // Only allow certain fields to be updated
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      message: 'Failed to change password',
      error: error.message
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    message: 'Logout successful'
  });
});

module.exports = router;
