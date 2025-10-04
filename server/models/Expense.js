const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  originalAmount: {
    type: Number,
    required: true
  },
  originalCurrency: {
    type: String,
    required: true,
    uppercase: true,
    maxlength: 3
  },
  convertedAmount: {
    type: Number,
    required: true
  },
  convertedCurrency: {
    type: String,
    required: true,
    uppercase: true,
    maxlength: 3
  },
  exchangeRate: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Travel', 'Food', 'Stay', 'Transportation', 'Office Supplies', 'Entertainment', 'Training', 'Medical', 'Other']
  },
  subCategory: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  justification: {
    type: String,
    trim: true,
    maxlength: [1000, 'Justification cannot exceed 1000 characters']
  },
  expenseDate: {
    type: Date,
    required: [true, 'Expense date is required']
  },
  submissionDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'pending_manager', 'pending_finance', 'pending_director', 'approved', 'rejected', 'reimbursed'],
    default: 'draft'
  },
  receipts: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    ocrData: {
      extractedText: String,
      merchantName: String,
      amount: Number,
      date: Date,
      confidence: Number
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  approvalWorkflow: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['manager', 'finance', 'director'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comments: {
      type: String,
      trim: true,
      maxlength: [500, 'Comments cannot exceed 500 characters']
    },
    actionDate: {
      type: Date
    },
    priority: {
      type: Number,
      default: 1
    }
  }],
  currentApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  reimbursedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reimbursedAt: {
    type: Date
  },
  reimbursementMethod: {
    type: String,
    enum: ['bank_transfer', 'check', 'cash', 'other']
  },
  tags: [{
    type: String,
    trim: true
  }],
  isUrgent: {
    type: Boolean,
    default: false
  },
  projectCode: {
    type: String,
    trim: true
  },
  clientCode: {
    type: String,
    trim: true
  },
  location: {
    name: String,
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
expenseSchema.index({ employee: 1, status: 1 });
expenseSchema.index({ company: 1, status: 1 });
expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ submissionDate: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ currentApprover: 1, status: 1 });

// Virtual for total approval time
expenseSchema.virtual('approvalTime').get(function() {
  if (this.approvedAt && this.submissionDate) {
    return this.approvedAt - this.submissionDate;
  }
  return null;
});

// Virtual for is overdue
expenseSchema.virtual('isOverdue').get(function() {
  if (this.status === 'pending_manager' || this.status === 'pending_finance' || this.status === 'pending_director') {
    const daysSinceSubmission = (Date.now() - this.submissionDate) / (1000 * 60 * 60 * 24);
    return daysSinceSubmission > 7; // Consider overdue after 7 days
  }
  return false;
});

// Transform output
expenseSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Expense', expenseSchema);
