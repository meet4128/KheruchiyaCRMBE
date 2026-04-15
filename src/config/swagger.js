const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kheruchiya CRM API',
      version: '1.0.0',
      description: 'Inquiry & Air Ticket API with JWT authentication',
    },
    servers: [
      { url: '/', description: 'Current host (works with localhost or IP)' },
      { url: `http://localhost:${process.env.PORT || 5000}`, description: 'Localhost' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your access token',
        },
      },
      schemas: {
        ContactNumber: {
          type: 'object',
          required: ['countryCode', 'number'],
          properties: {
            countryCode: { type: 'string', example: '+91' },
            number: { type: 'string', pattern: '^\\d+$', minLength: 6, example: '9876543210' },
          },
        },
        FlightSegment: {
          type: 'object',
          required: ['from', 'to', 'departureDate', 'travellerCount', 'travelClass'],
          properties: {
            from: {
              type: 'object',
              required: ['code', 'city'],
              properties: {
                code: { type: 'string', example: 'BOM' },
                city: { type: 'string', example: 'Mumbai' },
              },
            },
            to: {
              type: 'object',
              required: ['code', 'city'],
              properties: {
                code: { type: 'string', example: 'DXB' },
                city: { type: 'string', example: 'Dubai' },
              },
            },
            departureDate: { type: 'string', format: 'date-time' },
            travellerCount: { type: 'integer', minimum: 1 },
            travelClass: { type: 'string', example: 'Economy' },
          },
        },
        AirTicket: {
          type: 'object',
          required: ['bookingType', 'flightSegments', 'remark'],
          properties: {
            bookingType: {
              type: 'string',
              enum: ['ONE_WAY', 'ROUND_TRIP', 'MULTI_CITY'],
            },
            flightSegments: {
              type: 'array',
              items: { $ref: '#/components/schemas/FlightSegment' },
            },
            typeOfVisa: {
              type: 'string',
              enum: ['Visitor Visa', 'Student Visa', 'PR', 'Work Permit'],
              nullable: true,
            },
            remark: { type: 'string' },
          },
        },
        ChecklistItem: {
          type: 'object',
          properties: {
            user: { type: 'string', nullable: true },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            priority: { type: 'string', nullable: true },
            category: { type: 'string', nullable: true },
            inLoop: { type: 'boolean', default: false },
            repeat: { type: 'object' },
          },
        },
        InquiryCreate: {
          type: 'object',
          required: [
            'title',
            'phoneNumber',
            'fullName',
            'typeOfClient',
            'address',
            'referenceNumber',
            'referenceName',
            'clientBehaviour',
            'typeOfBooking',
          ],
          properties: {
            title: { type: 'string' },
            phoneNumber: { $ref: '#/components/schemas/ContactNumber' },
            fullName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            typeOfClient: { type: 'string' },
            address: { type: 'string' },
            referenceNumber: { $ref: '#/components/schemas/ContactNumber' },
            referenceName: { type: 'string' },
            clientBehaviour: { type: 'string' },
            typeOfBooking: { type: 'string' },
            status: {
              type: 'string',
              enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
              default: 'PENDING',
            },
            airTicket: { $ref: '#/components/schemas/AirTicket' },
            checklist: {
              type: 'array',
              items: { $ref: '#/components/schemas/ChecklistItem' },
              default: [],
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
          },
        },
        LoginRequest: {
          type: 'object',
          properties: {
            userId: { type: 'string', example: 'dev-user' },
            email: { type: 'string', example: 'dev@example.com' },
            role: { type: 'string', example: 'user' },
          },
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string', description: 'Refresh token from login' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'integer', description: 'Access token expiry in seconds' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'Liveness and readiness' },
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Inquiries', description: 'Inquiry management' },
    ],
  },
  apis: [], // We define paths inline below
};

// Inline paths since we're not using JSDoc
const spec = {
  ...options.definition,
  paths: {
    '/api/v1/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Liveness probe - returns 200 if the server is up',
        responses: {
          200: {
            description: 'Server is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'ok' },
                        timestamp: { type: 'string', format: 'date-time' },
                        uptime: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness check',
        description: 'Returns 200 if server and database are ready to accept traffic',
        responses: {
          200: { description: 'Ready (DB connected)' },
          503: { description: 'Not ready (e.g. DB disconnected)' },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        description: 'Dev login - returns access and refresh tokens. Blocked in production.',
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: { $ref: '#/components/schemas/AuthResponse' },
                  },
                },
              },
            },
          },
          501: {
            description: 'Login not implemented (production)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'error' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/refresh-token': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh token',
        description: 'Get new access and refresh tokens using a valid refresh token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Tokens refreshed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: { $ref: '#/components/schemas/AuthResponse' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Refresh token missing',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'fail' },
                    data: {
                      type: 'object',
                      properties: { message: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Invalid or expired refresh token',
          },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user',
        description: 'Returns the current authenticated user data from the JWT token',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current user data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required' },
        },
      },
    },
    '/api/v1/inquiries': {
      post: {
        tags: ['Inquiries'],
        summary: 'Create inquiry',
        description: 'Create a new inquiry (requires authentication)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/InquiryCreate' },
            },
          },
        },
        responses: {
          201: {
            description: 'Inquiry created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        inquiry: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required' },
          409: { description: 'Reference number already exists' },
          422: { description: 'Validation failed' },
        },
      },
      get: {
        tags: ['Inquiries'],
        summary: 'List inquiries',
        description: 'Get paginated list of inquiries with optional filters',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'typeOfBooking', in: 'query', schema: { type: 'string' } },
          { name: 'typeOfClient', in: 'query', schema: { type: 'string' } },
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
            },
          },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              default: '-createdAt',
              description: 'Sort field. Prefix with - for descending (e.g. -createdAt, fullName)',
            },
          },
        ],
        responses: {
          200: {
            description: 'List of inquiries',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        items: { type: 'array', items: { type: 'object' } },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        totalItems: { type: 'integer' },
                        totalPages: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required' },
        },
      },
    },
  },
};

module.exports = spec;
