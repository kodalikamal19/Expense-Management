const express = require('express');
const Approval = require('../models/Approval');
const Expense = require('../models/Expense');
const User = require('../models/User');
const { validate } = require('../middleware/validation');
const { approvalValidation } = require('../middleware/validation');
const { authenticateToken, authorize, authorizeCompany } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/approvals
// @desc    Get approvals for current user
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      role, 
      isUrgent,
      startDate,
      endDate 
    } = req.query;
    
    const skip = (page - 1) * limit;
    let filter = { approver: req.user._id };

    // Apply filters
    if (status) {
      filter.status = status;
    }
    if (role) {
      filter.role = role;
    }
    if (isUrgent !== undefined) {
      filter.isUrgent = isUrgent === 'true';
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const approvals = await Approval.find(filter)
      .populate({
        path: 'expense',
        populate: [
          { path: 'employee', select: 'firstName lastName email department' },
          { path: 'company', select: 'name country currency' }
        ]
      })
      .populate('approver', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Approval.countDocuments(filter);

    res.json({
      message: 'Approvals retrieved successfully',
      approvals,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get approvals error:', error);
    res.status(500).json({
      message: 'Failed to retrieve approvals',
      error: error.message
    });
  }
});

// @route   GET /api/approvals/:id
// @desc    Get approval by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const approval = await Approval.findById(req.params.id)
      .populate({
        path: 'expense',
        populate: [
          { path: 'employee', select: 'firstName lastName email department position' },
          { path: 'company', select: 'name country currency' },
          { path: 'currentApprover', select: 'firstName lastName email' }
        ]
      })
      .populate('approver', 'firstName lastName email role')
      .populate('escalatedTo', 'firstName lastName email role');

    if (!approval) {
      return res.status(404).json({
        message: 'Approval not found',
        code: 'APPROVAL_NOT_FOUND'
      });
    }

    // Check if user can access this approval
    if (approval.approver._id.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    res.json({
      message: 'Approval retrieved successfully',
      approval
    });
  } catch (error) {
    console.error('Get approval error:', error);
    res.status(500).json({
      message: 'Failed to retrieve approval',
      error: error.message
    });
  }
});

// @route   POST /api/approvals/:id/approve
// @desc    Approve an expense
// @access  Private
router.post('/:id/approve', authenticateToken, validate(approvalValidation.approve), async (req, res) => {
  try {
    const { comments, isUrgent } = req.body;

    const approval = await Approval.findById(req.params.id);

    if (!approval) {
      return res.status(404).json({
        message: 'Approval not found',
        code: 'APPROVAL_NOT_FOUND'
      });
    }

    // Check if user can approve this
    if (approval.approver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Check if approval is still pending
    if (approval.status !== 'pending') {
      return res.status(400).json({
        message: 'Approval is no longer pending',
        code: 'APPROVAL_NOT_PENDING'
      });
    }

    // Update approval
    approval.status = 'approved';
    approval.comments = comments;
    approval.actionDate = new Date();
    approval.isUrgent = isUrgent || false;
    await approval.save();

    // Update expense status
    const expense = await Expense.findById(approval.expense);
    if (expense) {
      // Check if this is the final approval
      const remainingApprovals = await Approval.find({
        expense: expense._id,
        status: 'pending'
      });

      if (remainingApprovals.length <= 1) {
        // This is the final approval
        expense.status = 'approved';
        expense.approvedBy = req.user._id;
        expense.approvedAt = new Date();
      } else {
        // Move to next approver
        const nextApproval = await Approval.findOne({
          expense: expense._id,
          status: 'pending',
          priority: { $gt: approval.priority }
        }).sort({ priority: 1 });

        if (nextApproval) {
          expense.currentApprover = nextApproval.approver;
          if (nextApproval.role === 'finance') {
            expense.status = 'pending_finance';
          } else if (nextApproval.role === 'director') {
            expense.status = 'pending_director';
          }
        }
      }

      await expense.save();
    }

    res.json({
      message: 'Expense approved successfully',
      approval
    });
  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({
      message: 'Failed to approve expense',
      error: error.message
    });
  }
});

// @route   POST /api/approvals/:id/reject
// @desc    Reject an expense
// @access  Private
router.post('/:id/reject', authenticateToken, validate(approvalValidation.reject), async (req, res) => {
  try {
    const { comments, rejectionReason } = req.body;

    const approval = await Approval.findById(req.params.id);

    if (!approval) {
      return res.status(404).json({
        message: 'Approval not found',
        code: 'APPROVAL_NOT_FOUND'
      });
    }

    // Check if user can reject this
    if (approval.approver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Check if approval is still pending
    if (approval.status !== 'pending') {
      return res.status(400).json({
        message: 'Approval is no longer pending',
        code: 'APPROVAL_NOT_PENDING'
      });
    }

    // Update approval
    approval.status = 'rejected';
    approval.comments = comments;
    approval.actionDate = new Date();
    await approval.save();

    // Update expense status
    const expense = await Expense.findById(approval.expense);
    if (expense) {
      expense.status = 'rejected';
      expense.rejectionReason = rejectionReason || comments;
      await expense.save();
    }

    res.json({
      message: 'Expense rejected successfully',
      approval
    });
  } catch (error) {
    console.error('Reject expense error:', error);
    res.status(500).json({
      message: 'Failed to reject expense',
      error: error.message
    });
  }
});

// @route   POST /api/approvals/:id/escalate
// @desc    Escalate an expense
// @access  Private
router.post('/:id/escalate', authenticateToken, validate(approvalValidation.escalate), async (req, res) => {
  try {
    const { comments, escalationReason, escalatedTo } = req.body;

    const approval = await Approval.findById(req.params.id);

    if (!approval) {
      return res.status(404).json({
        message: 'Approval not found',
        code: 'APPROVAL_NOT_FOUND'
      });
    }

    // Check if user can escalate this
    if (approval.approver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Check if approval is still pending
    if (approval.status !== 'pending') {
      return res.status(400).json({
        message: 'Approval is no longer pending',
        code: 'APPROVAL_NOT_PENDING'
      });
    }

    // Verify escalated user exists and has appropriate role
    const escalatedUser = await User.findById(escalatedTo);
    if (!escalatedUser || !['manager', 'finance', 'admin'].includes(escalatedUser.role)) {
      return res.status(400).json({
        message: 'Invalid user for escalation',
        code: 'INVALID_ESCALATION_USER'
      });
    }

    // Update approval
    approval.status = 'escalated';
    approval.comments = comments;
    approval.escalationReason = escalationReason;
    approval.escalatedTo = escalatedTo;
    approval.escalationDate = new Date();
    await approval.save();

    // Create new approval for escalated user
    const newApproval = new Approval({
      expense: approval.expense,
      approver: escalatedTo,
      role: escalatedUser.role,
      status: 'pending',
      priority: approval.priority + 1
    });
    await newApproval.save();

    // Update expense
    const expense = await Expense.findById(approval.expense);
    if (expense) {
      expense.currentApprover = escalatedTo;
      if (escalatedUser.role === 'finance') {
        expense.status = 'pending_finance';
      } else if (escalatedUser.role === 'manager') {
        expense.status = 'pending_manager';
      }
      await expense.save();
    }

    res.json({
      message: 'Expense escalated successfully',
      approval,
      newApproval
    });
  } catch (error) {
    console.error('Escalate expense error:', error);
    res.status(500).json({
      message: 'Failed to escalate expense',
      error: error.message
    });
  }
});

// @route   GET /api/approvals/stats/summary
// @desc    Get approval statistics
// @access  Private
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, role } = req.query;
    let filter = { approver: req.user._id };

    // Apply date filters
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Apply role filter
    if (role) {
      filter.role = role;
    }

    const stats = await Approval.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const roleStats = await Approval.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get overdue approvals
    const overdueApprovals = await Approval.find({
      ...filter,
      status: 'pending',
      createdAt: { $lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } // 3 days ago
    }).countDocuments();

    res.json({
      message: 'Approval statistics retrieved successfully',
      stats: {
        byStatus: stats,
        byRole: roleStats,
        overdue: overdueApprovals
      }
    });
  } catch (error) {
    console.error('Get approval stats error:', error);
    res.status(500).json({
      message: 'Failed to retrieve approval statistics',
      error: error.message
    });
  }
});

// @route   PUT /api/approvals/:id/reminder
// @desc    Send reminder for pending approval
// @access  Private
router.put('/:id/reminder', authenticateToken, async (req, res) => {
  try {
    const approval = await Approval.findById(req.params.id);

    if (!approval) {
      return res.status(404).json({
        message: 'Approval not found',
        code: 'APPROVAL_NOT_FOUND'
      });
    }

    // Check if user can send reminder
    if (approval.approver.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Update reminder info
    approval.reminderSent = true;
    approval.lastReminderDate = new Date();
    approval.reminderCount += 1;
    await approval.save();

    // TODO: Send actual notification (email/SMS)
    // This would integrate with your notification service

    res.json({
      message: 'Reminder sent successfully',
      approval
    });
  } catch (error) {
    console.error('Send reminder error:', error);
    res.status(500).json({
      message: 'Failed to send reminder',
      error: error.message
    });
  }
});

module.exports = router;
