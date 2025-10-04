const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    maxlength: [50, 'Country name cannot exceed 50 characters']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'USD',
    uppercase: true,
    maxlength: [3, 'Currency code must be 3 characters']
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  contactInfo: {
    phone: String,
    email: String,
    website: String
  },
  settings: {
    approvalWorkflow: {
      type: String,
      enum: ['sequential', 'parallel', 'hybrid'],
      default: 'sequential'
    },
    maxExpenseAmount: {
      type: Number,
      default: 10000
    },
    requireReceipt: {
      type: Boolean,
      default: true
    },
    receiptThreshold: {
      type: Number,
      default: 25
    },
    autoApprovalLimit: {
      type: Number,
      default: 100
    },
    approvalRules: {
      percentageRule: {
        enabled: {
          type: Boolean,
          default: false
        },
        percentage: {
          type: Number,
          min: 0,
          max: 100,
          default: 60
        }
      },
      specificApproverRule: {
        enabled: {
          type: Boolean,
          default: false
        },
        approvers: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }]
      },
      hybridRules: {
        enabled: {
          type: Boolean,
          default: false
        },
        rules: [{
          condition: {
            type: String,
            enum: ['amount', 'category', 'department']
          },
          operator: {
            type: String,
            enum: ['greater_than', 'less_than', 'equals', 'contains']
          },
          value: mongoose.Schema.Types.Mixed,
          approvers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          }]
        }]
      }
    },
    expenseCategories: [{
      name: {
        type: String,
        required: true
      },
      description: String,
      maxAmount: Number,
      requiresApproval: {
        type: Boolean,
        default: true
      }
    }],
    notificationSettings: {
      emailNotifications: {
        type: Boolean,
        default: true
      },
      pushNotifications: {
        type: Boolean,
        default: true
      },
      notificationRecipients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
companySchema.index({ name: 1 });
companySchema.index({ country: 1 });
companySchema.index({ isActive: 1 });

// Virtual for total employees
companySchema.virtual('totalEmployees', {
  ref: 'User',
  localField: '_id',
  foreignField: 'company',
  count: true
});

// Transform output
companySchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Company', companySchema);
