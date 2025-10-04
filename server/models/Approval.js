const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema({
  expense: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    required: true
  },
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
    enum: ['pending', 'approved', 'rejected', 'escalated'],
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
  },
  escalationReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Escalation reason cannot exceed 500 characters']
  },
  escalatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  escalationDate: {
    type: Date
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
  }],
  isUrgent: {
    type: Boolean,
    default: false
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  lastReminderDate: {
    type: Date
  },
  reminderCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
approvalSchema.index({ approver: 1, status: 1 });
approvalSchema.index({ expense: 1 });
approvalSchema.index({ role: 1, status: 1 });
approvalSchema.index({ actionDate: -1 });

// Virtual for approval time
approvalSchema.virtual('approvalTime').get(function() {
  if (this.actionDate && this.createdAt) {
    return this.actionDate - this.createdAt;
  }
  return null;
});

// Virtual for is overdue
approvalSchema.virtual('isOverdue').get(function() {
  if (this.status === 'pending') {
    const daysSinceCreated = (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24);
    return daysSinceCreated > 3; // Consider overdue after 3 days
  }
  return false;
});

// Transform output
approvalSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Approval', approvalSchema);
