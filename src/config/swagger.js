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
            role: {
              type: 'string',
              enum: ['admin', 'sales', 'purchase', 'user'],
              example: 'user',
            },
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
        WhatsappSendRequest: {
          type: 'object',
          required: ['to', 'text'],
          properties: {
            to: {
              type: 'string',
              pattern: '^\\d{10,15}$',
              description: 'WhatsApp ID / phone in E.164 form without + (digits only)',
              example: '919876543210',
            },
            text: { type: 'string', maxLength: 4096, example: 'Your flight options...' },
          },
        },
        DepartmentRoleItem: {
          type: 'object',
          required: ['department', 'role'],
          properties: {
            department: { type: 'string', example: 'Sales' },
            role: { type: 'string', example: 'Associate' },
          },
        },
        MemberCreate: {
          type: 'object',
          required: [
            'fullName',
            'personalEmail',
            'phoneNumber',
            'homePhoneNumber',
            'addressLine1',
            'zipCode',
            'city',
            'firstName',
            'lastName',
            'employeeId',
            'designation',
            'employmentStatus',
            'dateOfJoining',
            'departmentRoles',
            'officePhoneNumber',
          ],
          properties: {
            fullName: { type: 'string', example: 'Ravi Kumar' },
            personalEmail: { type: 'string', format: 'email', example: 'ravi@example.com' },
            phoneNumber: { $ref: '#/components/schemas/ContactNumber' },
            homePhoneNumber: { $ref: '#/components/schemas/ContactNumber' },
            dateOfBirth: { type: 'string', format: 'date', nullable: true, example: '1990-05-20' },
            gender: { type: 'string', enum: ['male', 'female'], nullable: true },
            maritalStatus: {
              type: 'string',
              enum: ['married', 'unmarried', 'widow'],
              nullable: true,
            },
            dateOfAnniversary: { type: 'string', format: 'date', nullable: true },
            addressLine1: { type: 'string', example: 'Flat 1, Example Towers' },
            addressLine2: { type: 'string', nullable: true, example: 'Near City Centre' },
            zipCode: { type: 'string', example: '380001' },
            city: { type: 'string', example: 'Ahmedabad' },
            firstName: { type: 'string', example: 'Ravi' },
            lastName: { type: 'string', example: 'Kumar' },
            employeeId: { type: 'string', example: 'EMP-1001' },
            designation: { type: 'string', example: 'Executive' },
            employmentStatus: {
              type: 'string',
              enum: ['active', 'inactive', 'probation', 'contract', 'terminated'],
            },
            dateOfJoining: { type: 'string', format: 'date', example: '2024-01-15' },
            departmentRoles: {
              type: 'array',
              minItems: 1,
              items: { $ref: '#/components/schemas/DepartmentRoleItem' },
            },
            officePhoneNumber: { $ref: '#/components/schemas/ContactNumber' },
            aadharDocumentUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://cdn.example.com/docs/aadhar.pdf',
            },
            panDocumentUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://cdn.example.com/docs/pan.jpg',
            },
            cancelChequeDocumentUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://cdn.example.com/docs/cheque.jpg',
            },
          },
        },
        MemberDocumentUrls: {
          type: 'object',
          description:
            'Paths to merge into POST/PATCH member JSON (aadharDocumentUrl, panDocumentUrl, cancelChequeDocumentUrl)',
          properties: {
            aadharDocumentUrl: { type: 'string', example: '/uploads/members/1730000000-abc.pdf' },
            panDocumentUrl: { type: 'string', example: '/uploads/members/1730000001-def.jpg' },
            cancelChequeDocumentUrl: {
              type: 'string',
              example: '/uploads/members/1730000002-ghi.png',
            },
          },
        },
        MemberUpdate: {
          type: 'object',
          minProperties: 1,
          description: 'At least one field required. All properties optional (partial update).',
          properties: {
            fullName: { type: 'string' },
            personalEmail: { type: 'string', format: 'email' },
            phoneNumber: { $ref: '#/components/schemas/ContactNumber' },
            homePhoneNumber: { $ref: '#/components/schemas/ContactNumber' },
            dateOfBirth: { type: 'string', format: 'date', nullable: true },
            gender: { type: 'string', enum: ['male', 'female'], nullable: true },
            maritalStatus: {
              type: 'string',
              enum: ['married', 'unmarried', 'widow'],
              nullable: true,
            },
            dateOfAnniversary: { type: 'string', format: 'date', nullable: true },
            addressLine1: { type: 'string' },
            addressLine2: { type: 'string', nullable: true },
            zipCode: { type: 'string' },
            city: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            employeeId: { type: 'string' },
            designation: { type: 'string' },
            employmentStatus: {
              type: 'string',
              enum: ['active', 'inactive', 'probation', 'contract', 'terminated'],
            },
            dateOfJoining: { type: 'string', format: 'date' },
            departmentRoles: {
              type: 'array',
              minItems: 1,
              items: { $ref: '#/components/schemas/DepartmentRoleItem' },
            },
            officePhoneNumber: { $ref: '#/components/schemas/ContactNumber' },
            aadharDocumentUrl: { type: 'string', format: 'uri', nullable: true },
            panDocumentUrl: { type: 'string', format: 'uri', nullable: true },
            cancelChequeDocumentUrl: { type: 'string', format: 'uri', nullable: true },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'Liveness and readiness' },
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Inquiries', description: 'Inquiry management' },
      { name: 'Members', description: 'Member (HR) management' },
      { name: 'WhatsApp', description: 'WhatsApp Cloud API webhook and agent send' },
    ],
  },
  apis: [], // We define paths inline below
};

// Inline paths since we're not using JSDoc
const spec = {
  ...options.definition,
  paths: {
    '/webhooks/whatsapp': {
      get: {
        tags: ['WhatsApp'],
        summary: 'Webhook verification (Meta)',
        description:
          'Meta calls this with hub.mode, hub.verify_token, hub.challenge when saving the webhook URL. Must match WHATSAPP_VERIFY_TOKEN.',
        parameters: [
          { name: 'hub.mode', in: 'query', schema: { type: 'string', example: 'subscribe' } },
          { name: 'hub.verify_token', in: 'query', schema: { type: 'string' } },
          { name: 'hub.challenge', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Returns hub.challenge as plain text' },
          403: { description: 'Verify token mismatch' },
          503: { description: 'WHATSAPP_VERIFY_TOKEN not configured' },
        },
      },
      post: {
        tags: ['WhatsApp'],
        summary: 'Webhook events (Meta)',
        description:
          'Inbound WhatsApp events. When `WHATSAPP_APP_SECRET` is set, requests must include a valid `X-Hub-Signature-256` header computed from the raw request body.',
        parameters: [
          {
            name: 'X-Hub-Signature-256',
            in: 'header',
            required: false,
            schema: {
              type: 'string',
              example: 'sha256=<hmac-hex>',
            },
            description: 'Required when WHATSAPP_APP_SECRET is configured. Format: `sha256=<hex>`.',
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                example: {
                  object: 'whatsapp_business_account',
                  entry: [],
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Acknowledged' },
          403: {
            description:
              'Invalid or missing signature (or signature verification failed when WHATSAPP_APP_SECRET is set)',
          },
        },
      },
    },
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
    '/api/v1/members/document-uploads': {
      post: {
        tags: ['Members'],
        summary: 'Upload member documents (PDF or image)',
        description:
          '**Admin only.** Multipart form with optional file fields `aadharCard`, `panCard`, `cancelCheque` (at least one required). Allowed: PDF, JPEG, PNG, WebP, GIF. Max size per file: `MEMBER_DOC_MAX_BYTES` (default 5MB). Returns paths under `/uploads/members/` to include in **POST**/**PATCH** member JSON.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  aadharCard: {
                    type: 'string',
                    format: 'binary',
                    description: 'Aadhar (PDF or image)',
                  },
                  panCard: { type: 'string', format: 'binary', description: 'PAN (PDF or image)' },
                  cancelCheque: {
                    type: 'string',
                    format: 'binary',
                    description: 'Cancel cheque (PDF or image)',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Uploaded file paths',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        urls: { $ref: '#/components/schemas/MemberDocumentUrls' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'No files or invalid upload' },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden (not admin)' },
        },
      },
    },
    '/api/v1/members': {
      get: {
        tags: ['Members'],
        summary: 'List members',
        description: 'Paginated list of members. **Requires `admin` role.**',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              default: '-createdAt',
              description: 'Sort by allowed fields; prefix with - for desc',
            },
          },
          {
            name: 'employmentStatus',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['active', 'inactive', 'probation', 'contract', 'terminated'],
            },
          },
          { name: 'city', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string', maxLength: 100 } },
        ],
        responses: {
          200: {
            description: 'List of members',
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
          403: { description: 'Forbidden (not admin)' },
          422: { description: 'Validation failed' },
        },
      },
      post: {
        tags: ['Members'],
        summary: 'Create member',
        description:
          'Create a new member record. **Requires `admin` role.**\n\n- **`application/json`:** body matches **MemberCreate** (optional `*DocumentUrl` as https or `/uploads/members/...`).\n- **`multipart/form-data`:** same fields as plain text; **`phoneNumber`**, **`homePhoneNumber`**, **`officePhoneNumber`**, and **`departmentRoles`** must be **JSON strings**; attach optional files **`aadharCard`**, **`panCard`**, **`cancelCheque`** (PDF or image). `createdBy` is never sent by the client.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemberCreate' },
            },
            'multipart/form-data': {
              schema: {
                type: 'object',
                description:
                  'Mirror **MemberCreate** using form fields. Nested values as JSON strings. Optional file parts: aadharCard, panCard, cancelCheque.',
                properties: {
                  fullName: { type: 'string' },
                  personalEmail: { type: 'string' },
                  phoneNumber: {
                    type: 'string',
                    example: '{"countryCode":"+91","number":"9876543210"}',
                  },
                  homePhoneNumber: { type: 'string' },
                  addressLine1: { type: 'string' },
                  zipCode: { type: 'string' },
                  city: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  employeeId: { type: 'string' },
                  designation: { type: 'string' },
                  employmentStatus: { type: 'string' },
                  dateOfJoining: { type: 'string', example: '2024-01-15' },
                  departmentRoles: {
                    type: 'string',
                    example: '[{"department":"Sales","role":"Associate"}]',
                  },
                  officePhoneNumber: { type: 'string' },
                  dateOfBirth: { type: 'string' },
                  gender: { type: 'string' },
                  maritalStatus: { type: 'string' },
                  dateOfAnniversary: { type: 'string' },
                  addressLine2: { type: 'string' },
                  aadharCard: { type: 'string', format: 'binary', description: 'PDF or image' },
                  panCard: { type: 'string', format: 'binary' },
                  cancelCheque: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Member created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        member: { type: 'object', description: 'Persisted member document' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden (not admin)' },
          409: { description: 'Employee ID (or personal email) already exists' },
          422: { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/members/{id}': {
      patch: {
        tags: ['Members'],
        summary: 'Update member',
        description:
          'Partial update of a member. **Requires `admin` JWT.** Use **`application/json`** (**MemberUpdate**) or **`multipart/form-data`** (same fields as text; nested objects as JSON strings; optional **`aadharCard`**, **`panCard`**, **`cancelCheque`** files).',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: '507f1f77bcf86cd799439011' },
            description: 'MongoDB ObjectId of the member',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemberUpdate' },
            },
            'multipart/form-data': {
              schema: {
                type: 'object',
                minProperties: 1,
                description:
                  'At least one field. Same keys as **MemberUpdate**; nested objects as JSON strings; optional file parts aadharCard, panCard, cancelCheque.',
                properties: {
                  fullName: { type: 'string' },
                  personalEmail: { type: 'string' },
                  phoneNumber: { type: 'string' },
                  homePhoneNumber: { type: 'string' },
                  officePhoneNumber: { type: 'string' },
                  departmentRoles: { type: 'string' },
                  aadharCard: { type: 'string', format: 'binary' },
                  panCard: { type: 'string', format: 'binary' },
                  cancelCheque: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Member updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        member: { type: 'object', description: 'Updated member document' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid member id format' },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden (not admin)' },
          404: { description: 'Member not found' },
          409: { description: 'Duplicate employee ID or personal email' },
          422: { description: 'Validation failed' },
        },
      },
      delete: {
        tags: ['Members'],
        summary: 'Delete member',
        description: 'Delete a member by id. **Requires `admin` JWT.**',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: '507f1f77bcf86cd799439011' },
            description: 'MongoDB ObjectId of the member',
          },
        ],
        responses: {
          200: {
            description: 'Member deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        member: { type: 'object', description: 'Deleted member document' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid member id format' },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden (not admin)' },
          404: { description: 'Member not found' },
        },
      },
    },
    '/api/v1/whatsapp/send': {
      post: {
        tags: ['WhatsApp'],
        summary: 'Send WhatsApp text message',
        description:
          'Sends a plain text message to a user via WhatsApp Cloud API (requires JWT). If Graph credentials are invalid/expired, response may be 502.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WhatsappSendRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Message accepted by Graph API' },
          401: { description: 'Authentication required' },
          422: { description: 'Validation failed' },
          502: { description: 'Graph API error' },
          503: { description: 'WhatsApp env not configured' },
        },
      },
    },
  },
};

module.exports = spec;
