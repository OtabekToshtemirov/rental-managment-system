# Rental Management System

A comprehensive web-based solution for managing rental properties, tenants, and lease agreements.

## Features

- Property Management
- Tenant Management
- Lease Agreement Tracking
- Payment Processing
- Maintenance Request Handling

## Tech Stack

- Frontend: React.js
- Backend: Node.js with Express
- Database: MongoDB
- Authentication: JWT

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone [your-repository-url]
```

2. Install dependencies:
```bash
cd rental-management-system
npm install
```

3. Create a `.env` file in the root directory and add your environment variables:
```
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

4. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Project Structure

```
rental-management-system/
├── src/
│   ├── components/    # React components
│   ├── models/        # Database models
│   ├── routes/        # API routes
│   ├── middleware/    # Custom middleware
│   └── utils/         # Utility functions
├── public/           # Static files
└── package.json
```

## API Documentation

The API endpoints are organized around the main resources:

- `/api/properties` - Property management
- `/api/tenants` - Tenant management
- `/api/leases` - Lease agreements
- `/api/payments` - Payment processing
- `/api/maintenance` - Maintenance requests

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.
