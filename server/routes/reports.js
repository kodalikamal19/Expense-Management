const express = require('express');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Company = require('../models/Company');
const Approval = require('../models/Approval');
const { authenticateToken, authorize, authorizeCompany } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/reports/expenses
// @desc    Get expense reports with filters
// @access  Private
router.get('/expenses', authenticateToken, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      employee,
      category,
      status,
      company,
      groupBy = 'month',
      format = 'json'
    } = req.query;

    let filter = {};

    // Apply company filter for non-admin users
    if (req.user.role !== 'admin') {
      filter.company = req.user.company;
    } else if (company) {
      filter.company = company;
    }

    // Apply date filters
    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) filter.expenseDate.$lte = new Date(endDate);
    }

    // Apply other filters
    if (employee) filter.employee = employee;
    if (category) filter.category = category;
    if (status) filter.status = status;

    let groupStage;
    switch (groupBy) {
      case 'day':
        groupStage = {
          $group: {
            _id: {
              year: { $year: '$expenseDate' },
              month: { $month: '$expenseDate' },
              day: { $dayOfMonth: '$expenseDate' }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            avgAmount: { $avg: '$amount' }
          }
        };
        break;
      case 'week':
        groupStage = {
          $group: {
            _id: {
              year: { $year: '$expenseDate' },
              week: { $week: '$expenseDate' }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            avgAmount: { $avg: '$amount' }
          }
        };
        break;
      case 'month':
      default:
        groupStage = {
          $group: {
            _id: {
              year: { $year: '$expenseDate' },
              month: { $month: '$expenseDate' }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            avgAmount: { $avg: '$amount' }
          }
        };
        break;
    }

    const pipeline = [
      { $match: filter },
      groupStage,
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
    ];

    const report = await Expense.aggregate(pipeline);

    // Get additional statistics
    const stats = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
          maxAmount: { $max: '$amount' },
          minAmount: { $min: '$amount' }
        }
      }
    ]);

    // Get category breakdown
    const categoryBreakdown = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Get status breakdown
    const statusBreakdown = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      message: 'Expense report generated successfully',
      report: {
        summary: stats[0] || {},
        timeline: report,
        categoryBreakdown,
        statusBreakdown
      }
    });
  } catch (error) {
    console.error('Get expense report error:', error);
    res.status(500).json({
      message: 'Failed to generate expense report',
      error: error.message
    });
  }
});

// @route   GET /api/reports/approvals
// @desc    Get approval reports
// @access  Private
router.get('/approvals', authenticateToken, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      approver,
      role,
      status,
      groupBy = 'month'
    } = req.query;

    let filter = {};

    // Apply approver filter
    if (approver) {
      filter.approver = approver;
    } else if (req.user.role !== 'admin') {
      filter.approver = req.user._id;
    }

    // Apply date filters
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Apply other filters
    if (role) filter.role = role;
    if (status) filter.status = status;

    let groupStage;
    switch (groupBy) {
      case 'day':
        groupStage = {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
          }
        };
        break;
      case 'week':
        groupStage = {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              week: { $week: '$createdAt' }
            },
            count: { $sum: 1 },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
          }
        };
        break;
      case 'month':
      default:
        groupStage = {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
          }
        };
        break;
    }

    const pipeline = [
      { $match: filter },
      groupStage,
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
    ];

    const report = await Approval.aggregate(pipeline);

    // Get approval statistics
    const stats = await Approval.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalApprovals: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          escalated: { $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] } }
        }
      }
    ]);

    // Get average approval time
    const approvalTimeStats = await Approval.aggregate([
      { $match: { ...filter, status: { $in: ['approved', 'rejected'] } } },
      {
        $addFields: {
          approvalTime: {
            $divide: [
              { $subtract: ['$actionDate', '$createdAt'] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgApprovalTime: { $avg: '$approvalTime' },
          maxApprovalTime: { $max: '$approvalTime' },
          minApprovalTime: { $min: '$approvalTime' }
        }
      }
    ]);

    res.json({
      message: 'Approval report generated successfully',
      report: {
        summary: stats[0] || {},
        timeline: report,
        approvalTime: approvalTimeStats[0] || {}
      }
    });
  } catch (error) {
    console.error('Get approval report error:', error);
    res.status(500).json({
      message: 'Failed to generate approval report',
      error: error.message
    });
  }
});

// @route   GET /api/reports/dashboard
// @desc    Get dashboard statistics
// @access  Private
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, company } = req.query;
    let filter = {};

    // Apply company filter
    if (company) {
      filter.company = company;
    } else if (req.user.role !== 'admin') {
      filter.company = req.user.company;
    }

    // Apply date filters
    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) filter.expenseDate.$lte = new Date(endDate);
    }

    // Get expense statistics
    const expenseStats = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          pendingAmount: {
            $sum: {
              $cond: [
                { $in: ['$status', ['pending_manager', 'pending_finance', 'pending_director']] },
                '$amount',
                0
              ]
            }
          },
          approvedAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0]
            }
          },
          rejectedAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'rejected'] }, '$amount', 0]
            }
          }
        }
      }
    ]);

    // Get status breakdown
    const statusBreakdown = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Get category breakdown
    const categoryBreakdown = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 }
    ]);

    // Get recent expenses
    const recentExpenses = await Expense.find(filter)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('amount category status description createdAt employee currentApprover');

    // Get approval statistics
    const approvalFilter = req.user.role === 'admin' ? {} : { approver: req.user._id };
    const approvalStats = await Approval.aggregate([
      { $match: approvalFilter },
      {
        $group: {
          _id: null,
          totalApprovals: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
        }
      }
    ]);

    // Get overdue approvals
    const overdueApprovals = await Approval.find({
      ...approvalFilter,
      status: 'pending',
      createdAt: { $lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } // 3 days ago
    }).countDocuments();

    res.json({
      message: 'Dashboard data retrieved successfully',
      dashboard: {
        expenses: expenseStats[0] || {},
        statusBreakdown,
        categoryBreakdown,
        recentExpenses,
        approvals: approvalStats[0] || {},
        overdueApprovals
      }
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      message: 'Failed to retrieve dashboard data',
      error: error.message
    });
  }
});

// @route   GET /api/reports/export
// @desc    Export reports in various formats
// @access  Private
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const {
      type = 'expenses',
      format = 'json',
      startDate,
      endDate,
      employee,
      category,
      status
    } = req.query;

    let filter = {};

    // Apply company filter for non-admin users
    if (req.user.role !== 'admin') {
      filter.company = req.user.company;
    }

    // Apply date filters
    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) filter.expenseDate.$lte = new Date(endDate);
    }

    // Apply other filters
    if (employee) filter.employee = employee;
    if (category) filter.category = category;
    if (status) filter.status = status;

    let data;
    let filename;

    switch (type) {
      case 'expenses':
        data = await Expense.find(filter)
          .populate('employee', 'firstName lastName email department')
          .populate('company', 'name country currency')
          .populate('currentApprover', 'firstName lastName email')
          .sort({ expenseDate: -1 });
        filename = `expenses_${new Date().toISOString().split('T')[0]}`;
        break;
      case 'approvals':
        const approvalFilter = req.user.role === 'admin' ? {} : { approver: req.user._id };
        data = await Approval.find(approvalFilter)
          .populate({
            path: 'expense',
            populate: [
              { path: 'employee', select: 'firstName lastName email' },
              { path: 'company', select: 'name' }
            ]
          })
          .populate('approver', 'firstName lastName email role')
          .sort({ createdAt: -1 });
        filename = `approvals_${new Date().toISOString().split('T')[0]}`;
        break;
      default:
        return res.status(400).json({
          message: 'Invalid report type',
          code: 'INVALID_TYPE'
        });
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
    } else {
      // Return JSON
      res.json({
        message: 'Export data retrieved successfully',
        data,
        metadata: {
          type,
          format,
          count: data.length,
          generatedAt: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      message: 'Failed to export report',
      error: error.message
    });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0].toObject ? data[0].toObject() : data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value).replace(/,/g, ';');
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

module.exports = router;
