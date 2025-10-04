const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createWorker } = require('tesseract.js');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/receipts';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// @route   POST /api/ocr/extract
// @desc    Extract text from receipt image using OCR
// @access  Private
router.post('/extract', authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No file uploaded',
        code: 'NO_FILE'
      });
    }

    const { data: { text } } = await createWorker().then(worker => {
      return worker.loadLanguage('eng').then(() => {
        return worker.initialize('eng');
      }).then(() => {
        return worker.recognize(req.file.path);
      }).then(({ data }) => {
        return worker.terminate().then(() => ({ data }));
      });
    });

    // Parse extracted text to extract relevant information
    const parsedData = parseReceiptText(text);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Text extracted successfully',
      extractedText: text,
      parsedData
    });
  } catch (error) {
    console.error('OCR extraction error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      message: 'Failed to extract text from image',
      error: error.message
    });
  }
});

// @route   POST /api/ocr/batch-extract
// @desc    Extract text from multiple receipt images
// @access  Private
router.post('/batch-extract', authenticateToken, upload.array('receipts', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: 'No files uploaded',
        code: 'NO_FILES'
      });
    }

    const results = [];

    for (const file of req.files) {
      try {
        const { data: { text } } = await createWorker().then(worker => {
          return worker.loadLanguage('eng').then(() => {
            return worker.initialize('eng');
          }).then(() => {
            return worker.recognize(file.path);
          }).then(({ data }) => {
            return worker.terminate().then(() => ({ data }));
          });
        });

        const parsedData = parseReceiptText(text);
        
        results.push({
          filename: file.originalname,
          extractedText: text,
          parsedData
        });

        // Clean up file
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error(`Error processing ${file.originalname}:`, error);
        results.push({
          filename: file.originalname,
          error: error.message
        });

        // Clean up file on error
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    res.json({
      message: 'Batch extraction completed',
      results
    });
  } catch (error) {
    console.error('Batch OCR extraction error:', error);
    
    // Clean up all files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({
      message: 'Failed to extract text from images',
      error: error.message
    });
  }
});

// Helper function to parse receipt text and extract relevant information
function parseReceiptText(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let merchantName = '';
  let amount = 0;
  let date = null;
  let category = 'Other';
  let confidence = 0;

  // Extract merchant name (usually first line or contains common business keywords)
  const businessKeywords = ['LTD', 'INC', 'CORP', 'LLC', 'STORE', 'SHOP', 'RESTAURANT', 'HOTEL'];
  for (const line of lines) {
    if (businessKeywords.some(keyword => line.toUpperCase().includes(keyword))) {
      merchantName = line;
      break;
    }
  }
  if (!merchantName && lines.length > 0) {
    merchantName = lines[0];
  }

  // Extract amount (look for currency patterns)
  const amountPatterns = [
    /TOTAL[:\s]*\$?(\d+\.?\d*)/i,
    /AMOUNT[:\s]*\$?(\d+\.?\d*)/i,
    /\$(\d+\.?\d*)/,
    /(\d+\.?\d*)\s*USD/i,
    /(\d+\.?\d*)\s*EUR/i,
    /(\d+\.?\d*)\s*GBP/i
  ];

  for (const pattern of amountPatterns) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        amount = parseFloat(match[1]);
        confidence += 0.3;
        break;
      }
    }
    if (amount > 0) break;
  }

  // Extract date (look for date patterns)
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s,]*\d{1,2}[\s,]*\d{2,4}/i
  ];

  for (const pattern of datePatterns) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        try {
          date = new Date(match[1]);
          if (!isNaN(date.getTime())) {
            confidence += 0.2;
            break;
          }
        } catch (e) {
          // Invalid date, continue
        }
      }
    }
    if (date) break;
  }

  // Categorize based on merchant name and keywords
  const merchantLower = merchantName.toLowerCase();
  const categoryKeywords = {
    'Travel': ['airline', 'flight', 'taxi', 'uber', 'lyft', 'train', 'bus', 'metro'],
    'Food': ['restaurant', 'cafe', 'coffee', 'food', 'dining', 'pizza', 'burger'],
    'Stay': ['hotel', 'motel', 'accommodation', 'lodging', 'airbnb'],
    'Transportation': ['gas', 'fuel', 'parking', 'toll', 'highway'],
    'Office Supplies': ['office', 'stationery', 'supplies', 'staples'],
    'Entertainment': ['movie', 'cinema', 'theater', 'concert', 'sports']
  };

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => merchantLower.includes(keyword))) {
      category = cat;
      confidence += 0.1;
      break;
    }
  }

  return {
    merchantName,
    amount,
    date,
    category,
    confidence: Math.min(confidence, 1.0)
  };
}

// @route   GET /api/ocr/supported-formats
// @desc    Get supported file formats for OCR
// @access  Private
router.get('/supported-formats', authenticateToken, (req, res) => {
  res.json({
    message: 'Supported formats retrieved successfully',
    formats: {
      image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'],
      maxFileSize: '10MB',
      maxFiles: 10
    }
  });
});

module.exports = router;
