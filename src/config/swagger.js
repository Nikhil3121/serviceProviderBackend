// src/config/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Service Provider API',
      version: '1.0.0',
      description: `
## Production-Ready Service Provider Backend

A fully featured REST API with:
- JWT authentication (access + refresh tokens)
- Role-based access control (admin / user)
- Email verification & Phone OTP verification
- Google reCAPTCHA protection
- Contact form with admin notifications
- Project/Service CRUD with image uploads
- Admin dashboard with analytics

### Authentication
Use the **Authorize** button and enter: \`Bearer <your_access_token>\`
      `,
      contact: { name: 'API Support', email: 'support@yourdomain.com' },
      license: { name: 'MIT' },
    },
    servers: [
      { url: '/api/v1', description: 'Current version' },
      { url: 'http://localhost:5000/api/v1', description: 'Local development' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your access token',
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'array', items: {} },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                totalPages: { type: 'integer' },
                hasNextPage: { type: 'boolean' },
                hasPrevPage: { type: 'boolean' },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin'] },
            isEmailVerified: { type: 'boolean' },
            isPhoneVerified: { type: 'boolean' },
            isActive: { type: 'boolean' },
            avatar: {
              type: 'object',
              properties: { url: { type: 'string' }, publicId: { type: 'string' } },
            },
            createdAt: { type: 'string', format: 'date-time' },
            lastLogin: { type: 'string', format: 'date-time' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            shortDescription: { type: 'string' },
            category: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            pricing: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['fixed', 'hourly', 'monthly', 'custom', 'free'] },
                amount: { type: 'number' },
                currency: { type: 'string' },
                label: { type: 'string' },
              },
            },
            isActive: { type: 'boolean' },
            isFeatured: { type: 'boolean' },
            viewCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Contact: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            subject: { type: 'string' },
            message: { type: 'string' },
            status: { type: 'string', enum: ['new', 'read', 'replied', 'closed'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        SignupRequest: {
          type: 'object',
          required: ['name', 'email', 'phone', 'password', 'confirmPassword'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 60 },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', example: '+919876543210' },
            password: { type: 'string', minLength: 8, description: 'Must have uppercase, lowercase, number, special char' },
            confirmPassword: { type: 'string' },
            captchaToken: { type: 'string', description: 'Google reCAPTCHA token' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
            captchaToken: { type: 'string' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication & authorization endpoints' },
      { name: 'Users', description: 'User profile management' },
      { name: 'Projects', description: 'Service/Project listings' },
      { name: 'Contact', description: 'Contact form submission' },
      { name: 'Admin', description: 'Admin-only endpoints' },
      { name: 'Health', description: 'API health check' },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

module.exports = swaggerJsdoc(options);
