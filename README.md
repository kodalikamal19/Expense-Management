# 🏢 Expense Management System

A comprehensive full-stack expense management system built with React, Node.js, Express, and MongoDB Atlas. Features JWT authentication, OCR receipt processing, role-based approval workflows, and multi-currency support.

## 🌟 Features

### 🔐 Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (Admin, Manager, Employee, Finance Officer)
- Secure password hashing with bcrypt
- Session management and token refresh

### 👥 User Management
- Multi-role user system with hierarchical permissions
- Company-based user organization
- Manager-employee relationships
- User profile management

### 💰 Expense Management
- Submit expense claims with receipts
- Multi-currency support with real-time conversion
- OCR integration for automatic receipt data extraction
- Expense categorization and tagging
- Draft, submit, and track expense status

### ✅ Approval Workflows
- Configurable approval sequences (Manager → Finance → Director)
- Role-based approval permissions
- Approval rules and thresholds
- Escalation and override capabilities
- Real-time status tracking

### 📊 Reporting & Analytics
- Comprehensive expense reports
- Approval analytics and metrics
- Dashboard with key metrics
- Export functionality (JSON, CSV)
- Date range and category filtering

### 🔍 OCR Integration
- Automatic receipt text extraction using Tesseract.js
- Smart data parsing (amount, date, merchant, category)
- Batch processing support
- Confidence scoring for extracted data

### 🌍 Multi-Currency Support
- Real-time currency conversion
- Support for major currencies (USD, EUR, GBP, CAD, AUD, JPY)
- Exchange rate API integration
- Automatic conversion to company base currency

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **React Icons** - Icon library
- **Recharts** - Data visualization
- **React Hot Toast** - Notifications
- **Axios** - HTTP client

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **Tesseract.js** - OCR processing
- **Joi** - Data validation

### Database
- **MongoDB Atlas** - Cloud database service
- **Mongoose ODM** - Object document mapping

## 📁 Project Structure

```
expense-management-system/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── App.js
│   └── package.json
├── server/                 # Node.js backend
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── uploads/           # File uploads
│   └── index.js
├── package.json           # Root package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd expense-management-system
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Environment Setup**
   
   Create `server/config.env` file:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/expense_management
   JWT_SECRET=your_jwt_secret_key_here
   JWT_REFRESH_SECRET=your_refresh_secret_key_here
   JWT_EXPIRE=7d
   JWT_REFRESH_EXPIRE=30d
   
   # Email configuration (optional)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   
   # Currency API (optional)
   CURRENCY_API_KEY=your_currency_api_key
   
   # Google Vision API (optional)
   GOOGLE_VISION_API_KEY=your_google_vision_api_key
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on `http://localhost:5000`
   - Frontend development server on `http://localhost:3000`

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | User login | Public |
| POST | `/api/auth/refresh` | Refresh access token | Public |
| GET | `/api/auth/me` | Get current user | Private |
| PUT | `/api/auth/me` | Update profile | Private |
| POST | `/api/auth/change-password` | Change password | Private |
| POST | `/api/auth/logout` | Logout user | Private |

### Company Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/company` | Get companies | Private |
| POST | `/api/company` | Create company | Admin |
| GET | `/api/company/:id` | Get company by ID | Private |
| PUT | `/api/company/:id` | Update company | Admin/Manager |
| DELETE | `/api/company/:id` | Delete company | Admin |
| GET | `/api/company/:id/users` | Get company users | Private |
| GET | `/api/company/:id/stats` | Get company stats | Private |

### User Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/users` | Get users | Private |
| POST | `/api/users` | Create user | Admin/Manager |
| GET | `/api/users/:id` | Get user by ID | Private |
| PUT | `/api/users/:id` | Update user | Admin/Manager/Self |
| DELETE | `/api/users/:id` | Delete user | Admin/Manager |
| GET | `/api/users/:id/employees` | Get user's employees | Private |
| GET | `/api/users/:id/expenses` | Get user's expenses | Private |

### Expense Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/expenses` | Get expenses | Private |
| POST | `/api/expenses` | Create expense | Private |
| GET | `/api/expenses/:id` | Get expense by ID | Private |
| PUT | `/api/expenses/:id` | Update expense | Private |
| DELETE | `/api/expenses/:id` | Delete expense | Private |
| POST | `/api/expenses/:id/submit` | Submit expense | Private |
| GET | `/api/expenses/stats/summary` | Get expense stats | Private |

### Approval Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/approvals` | Get approvals | Private |
| GET | `/api/approvals/:id` | Get approval by ID | Private |
| POST | `/api/approvals/:id/approve` | Approve expense | Private |
| POST | `/api/approvals/:id/reject` | Reject expense | Private |
| POST | `/api/approvals/:id/escalate` | Escalate expense | Private |
| GET | `/api/approvals/stats/summary` | Get approval stats | Private |

### OCR Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/ocr/extract` | Extract text from receipt | Private |
| POST | `/api/ocr/batch-extract` | Batch extract from receipts | Private |
| GET | `/api/ocr/supported-formats` | Get supported formats | Private |

### Report Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/reports/expenses` | Get expense reports | Private |
| GET | `/api/reports/approvals` | Get approval reports | Private |
| GET | `/api/reports/dashboard` | Get dashboard data | Private |
| GET | `/api/reports/export` | Export reports | Private |

## 🗄️ Database Schema

### User Model
```javascript
{
  firstName: String,
  lastName: String,
  email: String (unique),
  password: String (hashed),
  role: String (admin, manager, employee, finance),
  company: ObjectId (ref: Company),
  manager: ObjectId (ref: User),
  department: String,
  position: String,
  isActive: Boolean,
  preferences: Object
}
```

### Company Model
```javascript
{
  name: String,
  country: String,
  currency: String,
  settings: {
    approvalWorkflow: String,
    maxExpenseAmount: Number,
    requireReceipt: Boolean,
    autoApprovalLimit: Number,
    approvalRules: Object
  }
}
```

### Expense Model
```javascript
{
  employee: ObjectId (ref: User),
  company: ObjectId (ref: Company),
  amount: Number,
  originalCurrency: String,
  convertedAmount: Number,
  convertedCurrency: String,
  category: String,
  description: String,
  expenseDate: Date,
  status: String,
  receipts: Array,
  approvalWorkflow: Array
}
```

### Approval Model
```javascript
{
  expense: ObjectId (ref: Expense),
  approver: ObjectId (ref: User),
  role: String,
  status: String,
  comments: String,
  actionDate: Date
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-----------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_REFRESH_SECRET` | JWT refresh secret | Yes |
| `JWT_EXPIRE` | JWT expiration time | Yes |
| `JWT_REFRESH_EXPIRE` | Refresh token expiration | Yes |
| `EMAIL_HOST` | SMTP host for emails | No |
| `EMAIL_PORT` | SMTP port | No |
| `EMAIL_USER` | SMTP username | No |
| `EMAIL_PASS` | SMTP password | No |
| `CURRENCY_API_KEY` | Currency API key | No |
| `GOOGLE_VISION_API_KEY` | Google Vision API key | No |

### MongoDB Atlas Setup

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Create a database user
4. Whitelist your IP address
5. Get the connection string and update `MONGODB_URI`

## 🚀 Deployment

### Backend Deployment (Heroku)

1. Create a Heroku app
2. Set environment variables in Heroku dashboard
3. Connect to GitHub repository
4. Enable automatic deploys

```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_jwt_secret

# Deploy
git push heroku main
```

### Frontend Deployment (Netlify)

1. Build the React app
2. Deploy to Netlify
3. Set environment variables

```bash
# Build the app
cd client
npm run build

# Deploy to Netlify
# Upload the build folder to Netlify
```

## 🧪 Testing

### Backend Testing
```bash
cd server
npm test
```

### Frontend Testing
```bash
cd client
npm test
```

## 📱 Features by Role

### 👤 Employee
- Submit expense claims
- Upload receipts with OCR
- Track approval status
- View personal expense history
- Update profile

### 👨‍💼 Manager
- Approve/reject employee expenses
- View team expense reports
- Manage team members
- Escalate expenses
- View approval analytics

### 💼 Finance Officer
- Final expense approvals
- Compliance validation
- Financial reporting
- Reimbursement processing
- Audit trail access

### 🔧 Admin
- Company management
- User management
- System configuration
- Approval rule setup
- System analytics

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation with Joi
- Rate limiting
- CORS configuration
- Helmet security headers
- File upload restrictions

## 🎨 UI/UX Features

- Responsive design
- Dark/light theme toggle
- Real-time notifications
- Interactive dashboards
- Data visualization
- Mobile-friendly interface
- Accessibility support

## 📈 Performance Optimizations

- Database indexing
- API response caching
- Image optimization
- Lazy loading
- Code splitting
- Bundle optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🔮 Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] AI-powered expense categorization
- [ ] Integration with accounting software
- [ ] Multi-language support
- [ ] Advanced reporting features
- [ ] Workflow automation
- [ ] Real-time notifications
- [ ] Advanced OCR with machine learning
- [ ] Integration with banking APIs

---

**Built with ❤️ using React, Node.js, and MongoDB Atlas**
