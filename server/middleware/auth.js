const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        message: 'Access token required',
        code: 'NO_TOKEN'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid token - user not found',
        code: 'INVALID_TOKEN'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        message: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(500).json({ 
      message: 'Token verification failed',
      error: error.message
    });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

// Check if user can access company resources
const authorizeCompany = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Admin can access any company
    if (req.user.role === 'admin') {
      return next();
    }

    // Get company ID from params or body
    const companyId = req.params.companyId || req.body.company || req.query.company;
    
    if (!companyId) {
      return res.status(400).json({ 
        message: 'Company ID required',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    // Check if user belongs to the company
    if (req.user.company.toString() !== companyId.toString()) {
      return res.status(403).json({ 
        message: 'Access denied - different company',
        code: 'COMPANY_ACCESS_DENIED'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ 
      message: 'Company authorization failed',
      error: error.message
    });
  }
};

// Check if user can manage other users
const authorizeUserManagement = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Admin can manage any user
    if (req.user.role === 'admin') {
      return next();
    }

    // Manager can manage their employees
    if (req.user.role === 'manager') {
      const targetUserId = req.params.userId || req.body.userId;
      
      if (targetUserId) {
        const targetUser = await User.findById(targetUserId);
        
        if (!targetUser) {
          return res.status(404).json({ 
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          });
        }

        // Check if target user is under this manager
        if (targetUser.manager && targetUser.manager.toString() === req.user._id.toString()) {
          return next();
        }
      }
    }

    return res.status(403).json({ 
      message: 'Insufficient permissions for user management',
      code: 'USER_MANAGEMENT_DENIED'
    });
  } catch (error) {
    return res.status(500).json({ 
      message: 'User management authorization failed',
      error: error.message
    });
  }
};

// Optional authentication (for public routes that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

module.exports = {
  authenticateToken,
  authorize,
  authorizeCompany,
  authorizeUserManagement,
  optionalAuth
};
