const Joi = require('joi');

// User validation schemas
const userValidation = {
  register: Joi.object({
    firstName: Joi.string().trim().min(2).max(50).required()
      .messages({
        'string.empty': 'First name is required',
        'string.min': 'First name must be at least 2 characters',
        'string.max': 'First name cannot exceed 50 characters'
      }),
    lastName: Joi.string().trim().min(2).max(50).required()
      .messages({
        'string.empty': 'Last name is required',
        'string.min': 'Last name must be at least 2 characters',
        'string.max': 'Last name cannot exceed 50 characters'
      }),
    email: Joi.string().email().lowercase().required()
      .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please enter a valid email address'
      }),
    password: Joi.string().min(6).max(128).required()
      .messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 6 characters',
        'string.max': 'Password cannot exceed 128 characters'
      }),
    role: Joi.string().valid('admin', 'manager', 'employee', 'finance').optional()
      .messages({
        'any.only': 'Role must be one of: admin, manager, employee, finance'
      }),
    company: Joi.string().hex().length(24).optional()
      .messages({
        'string.hex': 'Company ID must be a valid MongoDB ObjectId',
        'string.length': 'Company ID must be 24 characters'
      }),
    manager: Joi.string().hex().length(24).optional()
      .messages({
        'string.hex': 'Manager ID must be a valid MongoDB ObjectId',
        'string.length': 'Manager ID must be 24 characters'
      }),
    department: Joi.string().trim().max(100).optional(),
    position: Joi.string().trim().max(100).optional(),
    phoneNumber: Joi.string().trim().optional(),
    address: Joi.object({
      street: Joi.string().trim().optional(),
      city: Joi.string().trim().optional(),
      state: Joi.string().trim().optional(),
      zipCode: Joi.string().trim().optional(),
      country: Joi.string().trim().optional()
    }).optional()
  }),

  login: Joi.object({
    email: Joi.string().email().lowercase().required()
      .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please enter a valid email address'
      }),
    password: Joi.string().required()
      .messages({
        'string.empty': 'Password is required'
      })
  }),

  update: Joi.object({
    firstName: Joi.string().trim().min(2).max(50).optional(),
    lastName: Joi.string().trim().min(2).max(50).optional(),
    department: Joi.string().trim().max(100).optional(),
    position: Joi.string().trim().max(100).optional(),
    phoneNumber: Joi.string().trim().optional(),
    address: Joi.object({
      street: Joi.string().trim().optional(),
      city: Joi.string().trim().optional(),
      state: Joi.string().trim().optional(),
      zipCode: Joi.string().trim().optional(),
      country: Joi.string().trim().optional()
    }).optional(),
    preferences: Joi.object({
      currency: Joi.string().length(3).uppercase().optional(),
      language: Joi.string().length(2).optional(),
      notifications: Joi.object({
        email: Joi.boolean().optional(),
        push: Joi.boolean().optional()
      }).optional()
    }).optional()
  })
};

// Company validation schemas
const companyValidation = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(100).required()
      .messages({
        'string.empty': 'Company name is required',
        'string.min': 'Company name must be at least 2 characters',
        'string.max': 'Company name cannot exceed 100 characters'
      }),
    country: Joi.string().trim().min(2).max(50).required()
      .messages({
        'string.empty': 'Country is required',
        'string.min': 'Country must be at least 2 characters',
        'string.max': 'Country cannot exceed 50 characters'
      }),
    currency: Joi.string().length(3).uppercase().default('USD')
      .messages({
        'string.length': 'Currency must be a 3-letter code',
        'string.uppercase': 'Currency must be uppercase'
      }),
    timezone: Joi.string().optional(),
    address: Joi.object({
      street: Joi.string().trim().optional(),
      city: Joi.string().trim().optional(),
      state: Joi.string().trim().optional(),
      zipCode: Joi.string().trim().optional(),
      country: Joi.string().trim().optional()
    }).optional(),
    contactInfo: Joi.object({
      phone: Joi.string().trim().optional(),
      email: Joi.string().email().optional(),
      website: Joi.string().uri().optional()
    }).optional()
  }),

  update: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    country: Joi.string().trim().min(2).max(50).optional(),
    currency: Joi.string().length(3).uppercase().optional(),
    timezone: Joi.string().optional(),
    address: Joi.object({
      street: Joi.string().trim().optional(),
      city: Joi.string().trim().optional(),
      state: Joi.string().trim().optional(),
      zipCode: Joi.string().trim().optional(),
      country: Joi.string().trim().optional()
    }).optional(),
    contactInfo: Joi.object({
      phone: Joi.string().trim().optional(),
      email: Joi.string().email().optional(),
      website: Joi.string().uri().optional()
    }).optional(),
    settings: Joi.object({
      approvalWorkflow: Joi.string().valid('sequential', 'parallel', 'hybrid').optional(),
      maxExpenseAmount: Joi.number().min(0).optional(),
      requireReceipt: Joi.boolean().optional(),
      receiptThreshold: Joi.number().min(0).optional(),
      autoApprovalLimit: Joi.number().min(0).optional()
    }).optional()
  })
};

// Expense validation schemas
const expenseValidation = {
  create: Joi.object({
    amount: Joi.number().positive().required()
      .messages({
        'number.positive': 'Amount must be positive',
        'any.required': 'Amount is required'
      }),
    originalCurrency: Joi.string().length(3).uppercase().required()
      .messages({
        'string.length': 'Currency must be a 3-letter code',
        'string.uppercase': 'Currency must be uppercase'
      }),
    category: Joi.string().valid(
      'Travel', 'Food', 'Stay', 'Transportation', 
      'Office Supplies', 'Entertainment', 'Training', 
      'Medical', 'Other'
    ).required()
      .messages({
        'any.only': 'Category must be one of the allowed values'
      }),
    subCategory: Joi.string().trim().max(100).optional(),
    description: Joi.string().trim().min(10).max(500).required()
      .messages({
        'string.empty': 'Description is required',
        'string.min': 'Description must be at least 10 characters',
        'string.max': 'Description cannot exceed 500 characters'
      }),
    justification: Joi.string().trim().max(1000).optional(),
    expenseDate: Joi.date().max('now').required()
      .messages({
        'date.base': 'Expense date must be a valid date',
        'date.max': 'Expense date cannot be in the future',
        'any.required': 'Expense date is required'
      }),
    tags: Joi.array().items(Joi.string().trim()).optional(),
    isUrgent: Joi.boolean().optional(),
    projectCode: Joi.string().trim().optional(),
    clientCode: Joi.string().trim().optional(),
    location: Joi.object({
      name: Joi.string().trim().optional(),
      address: Joi.string().trim().optional(),
      coordinates: Joi.object({
        latitude: Joi.number().min(-90).max(90).optional(),
        longitude: Joi.number().min(-180).max(180).optional()
      }).optional()
    }).optional()
  }),

  update: Joi.object({
    amount: Joi.number().positive().optional(),
    originalCurrency: Joi.string().length(3).uppercase().optional(),
    category: Joi.string().valid(
      'Travel', 'Food', 'Stay', 'Transportation', 
      'Office Supplies', 'Entertainment', 'Training', 
      'Medical', 'Other'
    ).optional(),
    subCategory: Joi.string().trim().max(100).optional(),
    description: Joi.string().trim().min(10).max(500).optional(),
    justification: Joi.string().trim().max(1000).optional(),
    expenseDate: Joi.date().max('now').optional(),
    tags: Joi.array().items(Joi.string().trim()).optional(),
    isUrgent: Joi.boolean().optional(),
    projectCode: Joi.string().trim().optional(),
    clientCode: Joi.string().trim().optional(),
    location: Joi.object({
      name: Joi.string().trim().optional(),
      address: Joi.string().trim().optional(),
      coordinates: Joi.object({
        latitude: Joi.number().min(-90).max(90).optional(),
        longitude: Joi.number().min(-180).max(180).optional()
      }).optional()
    }).optional()
  })
};

// Approval validation schemas
const approvalValidation = {
  approve: Joi.object({
    comments: Joi.string().trim().max(500).optional()
      .messages({
        'string.max': 'Comments cannot exceed 500 characters'
      }),
    isUrgent: Joi.boolean().optional()
  }),

  reject: Joi.object({
    comments: Joi.string().trim().min(10).max(500).required()
      .messages({
        'string.empty': 'Rejection reason is required',
        'string.min': 'Rejection reason must be at least 10 characters',
        'string.max': 'Rejection reason cannot exceed 500 characters'
      }),
    rejectionReason: Joi.string().trim().max(500).optional()
  }),

  escalate: Joi.object({
    comments: Joi.string().trim().max(500).optional(),
    escalationReason: Joi.string().trim().min(10).max(500).required()
      .messages({
        'string.empty': 'Escalation reason is required',
        'string.min': 'Escalation reason must be at least 10 characters',
        'string.max': 'Escalation reason cannot exceed 500 characters'
      }),
    escalatedTo: Joi.string().hex().length(24).required()
      .messages({
        'string.hex': 'Escalated to user ID must be a valid MongoDB ObjectId',
        'string.length': 'Escalated to user ID must be 24 characters'
      })
  })
};

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }

    req.body = value;
    next();
  };
};

module.exports = {
  userValidation,
  companyValidation,
  expenseValidation,
  approvalValidation,
  validate
};
