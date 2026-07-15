const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kheruchiya CRM API',
      version: '1.0.0',
      description: 'Inquiry & Air Ticket API with JWT authentication',
    },
    servers: [
      ...(process.env.PUBLIC_BASE_URL
        ? [
            {
              url: String(process.env.PUBLIC_BASE_URL).replace(/\/$/, ''),
              description: 'Public HTTPS (ngrok / deployed host)',
            },
          ]
        : []),
      { url: '/', description: 'Current host (works with localhost or IP)' },
      {
        url: `http://localhost:${process.env.PORT || 5001}`,
        description: 'Localhost',
      },
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
        HotelBooking: {
          type: 'object',
          required: ['city', 'checkInDate', 'checkOutDate', 'rooms', 'adults', 'remark'],
          properties: {
            city: { type: 'string' },
            checkInDate: { type: 'string', format: 'date-time' },
            checkOutDate: {
              type: 'string',
              format: 'date-time',
              description: 'Must be on or after checkInDate',
            },
            rooms: { type: 'integer', minimum: 1 },
            adults: { type: 'integer', minimum: 1 },
            propertyType: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['Hotel', 'Resort', 'Villa', 'Cottage', 'Homestay', 'Camp', 'Houseboat'],
              },
              default: [],
            },
            hotelCategory: {
              type: 'array',
              items: { type: 'string', enum: ['3 Star', '4 Star', '5 Star'] },
              default: [],
            },
            roomViews: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['Garden View', 'Sea View', 'City View', 'Pool View', 'River View'],
              },
              default: [],
            },
            amenities: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'Swimming Pool',
                  'Wifi',
                  'Spa',
                  'Restaurant',
                  'Parking',
                  'Bonfire',
                  'Bar',
                  'Balcony Terrace',
                  'Kitchen',
                  'Caretaker',
                  'Lift',
                ],
              },
              default: [],
            },
            mealPlan: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['Continental Plan', 'Only Breakfast', 'Breakfast & Dinner', 'All Meal'],
              },
              default: [],
            },
            transfers: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['Airport Transfers', 'Railway Station Transfer', 'Sight Seeing Transfers'],
              },
              default: [],
            },
            budgetMin: {
              type: 'string',
              description: 'Digits-only string, e.g. "20000". May be empty.',
            },
            budgetMax: {
              type: 'string',
              description: 'Digits-only string; if both present, budgetMax >= budgetMin.',
            },
            remark: { type: 'string' },
          },
        },
        ChecklistItem: {
          type: 'object',
          required: ['priority'],
          properties: {
            user: {
              type: 'array',
              description: 'Assigned member snapshots',
              default: [],
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string', example: 'string' },
                  fullName: { type: 'string', example: 'Priya Shah' },
                  firstName: { type: 'string', example: 'string' },
                  lastName: { type: 'string', example: 'string' },
                  employeeId: { type: 'string', example: 'EMP-1001' },
                },
              },
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description:
                'Optional. When omitted, the server sets due date from priority (HIGH 15 min, MEDIUM 8 h, LOW 24 h).',
            },
            priority: {
              type: 'string',
              enum: ['HIGH', 'MEDIUM', 'LOW'],
            },
            category: { type: 'string', nullable: true },
            inLoop: { type: 'boolean', default: false },
            repeat: { type: 'object' },
          },
        },
        ChecklistPriorityDefault: {
          type: 'object',
          properties: {
            value: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
            dueInMinutes: { type: 'number', description: 'Present for HIGH (15)' },
            dueInHours: { type: 'number', description: 'Present for MEDIUM (8) and LOW (24)' },
            dueInMs: { type: 'number' },
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
              enum: ['PENDING', 'IN_PROGRESS', 'FOLLOWUP', 'COMPLETED', 'CANCELLED'],
              default: 'PENDING',
            },
            airTicket: {
              allOf: [{ $ref: '#/components/schemas/AirTicket' }],
              description: 'Required when typeOfBooking is "Flight Booking"; omit otherwise.',
            },
            hotelBooking: {
              allOf: [{ $ref: '#/components/schemas/HotelBooking' }],
              description: 'Required when typeOfBooking is "Hotel Booking"; omit otherwise.',
            },
            checklist: {
              type: 'array',
              items: { $ref: '#/components/schemas/ChecklistItem' },
              default: [],
            },
            assignedTo: {
              type: 'object',
              nullable: true,
              description:
                'Inquiry-level assignee (set via PATCH /inquiries/{id}/assign). Absent/null means unassigned.',
              properties: {
                _id: { type: 'string', example: '507f191e810c19729de860ea' },
                fullName: { type: 'string', example: 'Priya Shah' },
                firstName: { type: 'string', example: 'Priya' },
                lastName: { type: 'string', example: 'Shah' },
                employeeId: { type: 'string', example: 'EMP-1001' },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            role: {
              type: 'string',
              enum: ['admin', 'sales', 'purchase', 'account', 'user'],
              description:
                "Derived at login from the member's departmentRoles[].department (case-insensitive): Admin→admin, Sales→sales, Purchase→purchase, Account/Accounts/Accounting→account, else→user",
            },
            tokenVersion: { type: 'integer', minimum: 0 },
            fullName: { type: 'string' },
            invitationStatus: { type: 'string', enum: ['pending', 'active', 'suspended'] },
          },
        },
        LoginRequest: {
          type: 'object',
          description:
            'Dual-mode body: send `{ email, password }` for real auth, or `{ userId, email?, role? }` for the dev/test stub (non-production only).',
          properties: {
            email: { type: 'string', format: 'email', example: 'aisha@example.com' },
            password: {
              type: 'string',
              minLength: 8,
              maxLength: 128,
              example: 'Secret123',
              description: 'Required for real-auth login; omit for dev stub',
            },
            userId: { type: 'string', example: 'dev-user', description: 'Dev stub only' },
            role: {
              type: 'string',
              enum: ['admin', 'sales', 'purchase', 'account', 'user'],
              example: 'user',
              description: 'Dev stub only. In real-auth mode the role is derived from the DB.',
            },
          },
        },
        SetPasswordRequest: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: {
              type: 'string',
              pattern: '^[a-f0-9]{64}$',
              description: '64-hex-char raw token from the invite email link',
            },
            password: {
              type: 'string',
              minLength: 8,
              maxLength: 128,
              description: 'Must contain at least one letter and one digit',
              example: 'Secret123',
            },
          },
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: { type: 'string', pattern: '^[a-f0-9]{64}$' },
            password: { type: 'string', minLength: 8, maxLength: 128, example: 'NewSecret123' },
          },
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email', example: 'aisha@example.com' },
          },
        },
        TokenValidateResponse: {
          type: 'object',
          properties: {
            valid: { type: 'boolean', example: true },
            purpose: { type: 'string', enum: ['invite', 'reset'] },
            email: {
              type: 'string',
              description: 'Masked form, e.g. "a****@example.com"',
              example: 'a****@example.com',
            },
            expiresAt: { type: 'string', format: 'date-time' },
          },
        },
        InviteResult: {
          type: 'object',
          properties: {
            sent: { type: 'boolean', example: true },
            sentTo: { type: 'string', format: 'email', example: 'aisha@example.com' },
            expiresAt: { type: 'string', format: 'date-time' },
            devFallback: {
              type: 'boolean',
              description:
                'true when no RESEND_API_KEY is configured (dev) and the link was only logged to console',
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
          required: ['to'],
          properties: {
            to: {
              type: 'string',
              pattern: '^\\d{10,15}$',
              description: 'WhatsApp ID / phone in E.164 form without + (digits only)',
              example: '919876543210',
            },
            type: {
              type: 'string',
              enum: ['text', 'document', 'image', 'template'],
              default: 'text',
              description:
                'Use **template** for first outbound message (no 24h window). Use **text** only when customer messaged within 24 hours.',
            },
            text: {
              type: 'string',
              maxLength: 4096,
              description: 'Message body or document/image caption. Required when type is text.',
              example: 'Your flight options...',
            },
            template: {
              type: 'object',
              description:
                'Required when type is template. Template must be approved in WhatsApp Manager.',
              properties: {
                name: {
                  type: 'string',
                  pattern: '^[a-z0-9_]+$',
                  example: 'customer_greeting',
                },
                language: { type: 'string', example: 'en' },
                bodyParams: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Replaces {{1}}, {{2}}, … in template body',
                },
                headerParams: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Replaces variables in template header (if any)',
                },
              },
              required: ['name', 'language'],
            },
            sessionId: {
              type: 'string',
              minLength: 8,
              maxLength: 64,
              description: 'Flutter UUID — required with inquiryId for amendment live chat',
              example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            },
            inquiryId: {
              type: 'string',
              description: 'MongoDB inquiry _id — required with sessionId for amendment chat',
              example: '507f1f77bcf86cd799439011',
            },
            mediaUrl: {
              type: 'string',
              description:
                'Server path from session upload (e.g. /uploads/amendments/session/...). Required for document/image. Needs PUBLIC_BASE_URL for Meta.',
            },
            fileName: { type: 'string', example: 'aadhar.pdf' },
          },
        },
        AmendmentFinalizeRequest: {
          type: 'object',
          required: ['action', 'amendmentType'],
          properties: {
            action: {
              type: 'string',
              enum: ['put_follow_up', 'mark_pending', 'mark_loss', 'mark_won'],
            },
            amendmentType: {
              type: 'string',
              enum: ['re_issue', 'cancelation', 'booking'],
              description: 'ID prefix: TAIR / TCAN / TBOOK',
            },
            amountCharged: {
              type: 'number',
              minimum: 0,
              description: 'Required when action is mark_won (INR, decimals allowed)',
              example: 13500.5,
            },
            sessionId: {
              type: 'string',
              minLength: 8,
              maxLength: 64,
              description: 'Attach live chat messages/notes from this session',
            },
            notes: {
              type: 'array',
              items: {
                type: 'object',
                required: ['text'],
                properties: { text: { type: 'string' } },
              },
            },
          },
        },
        AmendmentNoteRequest: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', maxLength: 2000, example: 'Customer agreed to re-issue fare' },
          },
        },
        Amendment: {
          type: 'object',
          properties: {
            amendmentId: { type: 'string', example: 'TAIR59733107042' },
            amendmentType: { type: 'string', enum: ['re_issue', 'cancelation', 'booking'] },
            status: { type: 'string', enum: ['followup', 'pending', 'loss', 'completed'] },
            amountCharged: { type: 'number', nullable: true },
            sessionId: { type: 'string', nullable: true },
            inquiryId: { type: 'string' },
            createdBy: { type: 'string' },
            processedAt: { type: 'string', format: 'date-time' },
            chatLockedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AmendmentNote: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            createdBy: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Reminder: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            inquiryId: { type: 'string' },
            amendmentId: { type: 'string', example: 'TAIR59733107042' },
            sessionId: { type: 'string', nullable: true },
            note: { type: 'string', example: 'Call client to confirm re-issue' },
            remindAt: { type: 'string', format: 'date-time', example: '2026-07-10T15:30:00.000Z' },
            recurrenceRule: {
              type: 'string',
              example: 'FREQ=WEEKLY;BYDAY=MO;COUNT=5',
              description: 'RFC 5545 RRULE; empty string = single occurrence',
            },
            agent: {
              oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/MemberRef' }],
              description: 'Member id, or populated member on reads',
            },
            inLoopUsers: {
              type: 'array',
              items: { $ref: '#/components/schemas/MemberRef' },
            },
            priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
            status: {
              type: 'string',
              enum: ['PENDING', 'IN_PROGRESS', 'FOLLOWUP', 'COMPLETED', 'CANCELLED'],
            },
            createdBy: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        MemberRef: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            fullName: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            personalEmail: { type: 'string' },
          },
        },
        CalendarEvent: {
          allOf: [
            { $ref: '#/components/schemas/Reminder' },
            {
              type: 'object',
              properties: {
                reminderId: { type: 'string' },
                occurrenceAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'The specific occurrence time within the queried range',
                },
              },
            },
          ],
        },
        AmendmentMessage: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['text', 'document', 'image'] },
            direction: { type: 'string', enum: ['inbound', 'outbound'] },
            senderType: { type: 'string', enum: ['employee', 'customer', 'system'] },
            text: { type: 'string' },
            mediaUrl: { type: 'string', nullable: true },
            fileName: { type: 'string', nullable: true },
            mimeType: { type: 'string', nullable: true },
            peerPhone: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
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
        PurchaseChatOpenRequest: {
          type: 'object',
          required: ['purchaseTeamMemberId'],
          properties: {
            purchaseTeamMemberId: {
              type: 'string',
              example: '507f1f77bcf86cd799439012',
              description: 'Member._id from GET /members/directory?department=Purchase',
            },
          },
        },
        PurchaseTeamChatMessage: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            inquiryId: { type: 'string' },
            purchaseTeamMemberId: { type: 'string' },
            senderUserId: { type: 'string' },
            senderRole: { type: 'string', enum: ['sales', 'purchase', 'admin'] },
            type: { type: 'string', enum: ['text', 'document', 'image'] },
            text: { type: 'string' },
            mediaUrl: { type: 'string', nullable: true },
            fileName: { type: 'string', nullable: true },
            mimeType: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        PurchaseChatMessageRequest: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['text', 'document', 'image'], default: 'text' },
            text: { type: 'string', description: 'Message body or caption' },
            mediaUrl: {
              type: 'string',
              description: 'From POST .../uploads (required for document/image)',
            },
            fileName: { type: 'string' },
            mimeType: { type: 'string' },
          },
        },
        MemberDirectoryItem: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            fullName: { type: 'string', example: 'Priya Shah' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            employeeId: { type: 'string' },
            designation: { type: 'string', example: 'Purchase Executive' },
            employmentStatus: { type: 'string', example: 'active' },
            departmentRoles: {
              type: 'array',
              items: { $ref: '#/components/schemas/DepartmentRoleItem' },
            },
            officePhoneNumber: { $ref: '#/components/schemas/ContactNumber' },
            phoneNumber: { $ref: '#/components/schemas/ContactNumber' },
            personalEmail: { type: 'string', format: 'email' },
            city: { type: 'string' },
          },
        },
        MemberNameItem: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            fullName: { type: 'string', example: 'Priya Shah' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            employeeId: { type: 'string', example: 'EMP-1001' },
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
            sendInvite: {
              type: 'boolean',
              default: true,
              description:
                'When true (default) the backend issues a single-use invite token (72h TTL) and emails a set-password link. Pass false to skip the email (member will need a manual resend later).',
            },
            inviteEmail: {
              type: 'string',
              format: 'email',
              description:
                'Optional. Overrides `personalEmail` as the invite recipient. Not persisted to the Member document.',
            },
          },
        },
        MemberUpdate: {
          type: 'object',
          minProperties: 1,
          description:
            'At least one field required. All properties optional (partial update).\n\n**Forbidden fields (loud 422):** `passwordHash`, `invitationStatus`, `lastInviteSentAt`, `passwordSetAt`, `passwordResetAt`, `lastLoginAt`, `tokenVersion`, `loginRole`. These are managed by the auth/password endpoints and cannot be set via PATCH.\n\n**Side effects:**\n- Changing `personalEmail` while `invitationStatus=pending` auto-invalidates old invite tokens and re-sends the invite to the new address.\n- Changing `personalEmail` while `invitationStatus=active` bumps `tokenVersion` (forces re-login).\n- Changing `employmentStatus` to `terminated`/`inactive` bumps `tokenVersion`.',
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
        PaymentInstallment: {
          type: 'object',
          required: ['amount'],
          properties: {
            amount: { type: 'number', minimum: 0, example: 25000 },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            receivedDate: { type: 'string', format: 'date-time', nullable: true },
            mode: {
              type: 'string',
              enum: ['Cash', 'UPI', 'Cheque'],
              nullable: true,
              description: 'Unset until the payment is received',
            },
            status: {
              type: 'string',
              description:
                'Free-text label computed on the frontend from dueDate vs receivedDate (e.g. "On Time" / "Late")',
              example: 'On Time',
            },
            paymentProofUrl: {
              type: 'string',
              description: 'Path from POST .../payment-plan/uploads',
              example: '/uploads/payment-proofs/507f1f77bcf86cd799439011/172000-abc.jpg',
            },
          },
        },
        PaymentPlanSaveRequest: {
          type: 'object',
          required: ['totalAmount', 'numberOfInstallments', 'installments'],
          description:
            'Upsert: creates the plan on first save, overwrites it (header + full installment list) on subsequent saves. `installments.length` must equal `numberOfInstallments`.',
          properties: {
            travelDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Travel date & time',
            },
            bookingType: { type: 'string', example: 'Round Trip' },
            totalAmount: { type: 'number', minimum: 0, example: 50000 },
            numberOfInstallments: { type: 'integer', minimum: 1, example: 3 },
            paymentReceivedTillNow: { type: 'number', minimum: 0, default: 0, example: 0 },
            installments: {
              type: 'array',
              minItems: 1,
              items: { $ref: '#/components/schemas/PaymentInstallment' },
            },
          },
        },
        PaymentPlan: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            inquiryId: { type: 'string' },
            travelDate: { type: 'string', format: 'date-time', nullable: true },
            bookingType: { type: 'string' },
            totalAmount: { type: 'number' },
            numberOfInstallments: { type: 'integer' },
            paymentReceivedTillNow: { type: 'number' },
            installments: {
              type: 'array',
              items: { $ref: '#/components/schemas/PaymentInstallment' },
            },
            createdBy: { type: 'string' },
            updatedBy: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'Liveness and readiness' },
      {
        name: 'Auth',
        description:
          'Authentication: login, refresh, me, password set/reset (invite + forgot flows).',
      },
      { name: 'Inquiries', description: 'Inquiry management' },
      {
        name: 'Amendments',
        description:
          'Inquiry amendments — finalize from Q&A chat (sales/admin). Live session uses sessionId.',
      },
      { name: 'Members', description: 'Member (HR) management' },
      {
        name: 'Payments',
        description:
          'Inquiry payment terms — travel/booking header + installment plan with proofs.',
      },
      {
        name: 'WhatsApp',
        description: 'WhatsApp Cloud API webhook, conversations, messages, and agent send',
      },
      {
        name: 'Reminders',
        description:
          'Follow-up reminders created from the Manage Amendment follow-up dialog (sales/admin).',
      },
      {
        name: 'Calendar',
        description: 'Calendar read — reminder occurrences expanded within a date range.',
      },
    ],
  },
  apis: [], // We define paths inline below
};

// Inline paths since we're not using JSDoc
const okReminder = {
  description: 'Reminder',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: {
            type: 'object',
            properties: { reminder: { $ref: '#/components/schemas/Reminder' } },
          },
        },
      },
    },
  },
};

const spec = {
  ...options.definition,
  paths: {
    '/api/v1/inquiries/{inquiryId}/amendments/{amendmentId}/reminders': {
      post: {
        tags: ['Reminders'],
        summary: 'Create a follow-up reminder for an amendment',
        description:
          '**Sales or admin.** Called by the follow-up dialog after the amendment is finalized with action `put_follow_up`. Persists the reminder schedule (remindAt, agent, in-loop users, priority, recurrence, note).',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'inquiryId', in: 'path', required: true, schema: { type: 'string' } },
          {
            name: 'amendmentId',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'TAIR59733107042' },
            description: 'Amendment business id.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['remindAt', 'agent', 'priority'],
                properties: {
                  remindAt: {
                    type: 'string',
                    format: 'date-time',
                    example: '2026-07-10T15:30:00+05:30',
                    description: 'ISO 8601 with offset; combined reminder date + time.',
                  },
                  agent: { type: 'string', description: 'Member id of the assigned agent.' },
                  priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
                  note: { type: 'string', maxLength: 2000 },
                  recurrenceRule: {
                    type: 'string',
                    example: 'FREQ=WEEKLY;BYDAY=MO;COUNT=5',
                    description: 'RFC 5545 RRULE; omit or empty for a single reminder.',
                  },
                  inLoopUsers: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Member ids kept in the loop.',
                  },
                  sessionId: { type: 'string', minLength: 8, maxLength: 64 },
                },
              },
            },
          },
        },
        responses: {
          201: okReminder,
          401: { description: 'Authentication required' },
          403: { description: 'Insufficient role (sales or admin required)' },
          404: { description: 'Inquiry or amendment not found' },
          422: { description: 'Validation failed (bad member id, RRULE, or missing field)' },
        },
      },
    },
    '/api/v1/reminders/{id}': {
      get: {
        tags: ['Reminders'],
        summary: 'Get a reminder by id',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: okReminder,
          401: { description: 'Authentication required' },
          404: { description: 'Reminder not found' },
        },
      },
      patch: {
        tags: ['Reminders'],
        summary: 'Update / reschedule a reminder',
        description: 'Partial update — send only changed fields (at least one required).',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                minProperties: 1,
                properties: {
                  remindAt: { type: 'string', format: 'date-time' },
                  agent: { type: 'string' },
                  priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
                  note: { type: 'string', maxLength: 2000 },
                  recurrenceRule: { type: 'string' },
                  inLoopUsers: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          200: okReminder,
          401: { description: 'Authentication required' },
          404: { description: 'Reminder not found' },
          422: { description: 'Validation failed' },
        },
      },
      delete: {
        tags: ['Reminders'],
        summary: 'Delete a reminder',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: { id: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required' },
          404: { description: 'Reminder not found' },
        },
      },
    },
    '/api/v1/reminders/{id}/status': {
      patch: {
        tags: ['Reminders'],
        summary: 'Update reminder follow-up status',
        description:
          'Sets the reminder status to PENDING, IN_PROGRESS, FOLLOWUP, COMPLETED, or CANCELLED. An optional `remindAt` reschedules the reminder.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['PENDING', 'IN_PROGRESS', 'FOLLOWUP', 'COMPLETED', 'CANCELLED'],
                  },
                  remindAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Optional new time to reschedule the reminder.',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: okReminder,
          401: { description: 'Authentication required' },
          404: { description: 'Reminder not found' },
          422: { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/calendar/events': {
      get: {
        tags: ['Calendar'],
        summary: 'List calendar events (reminder occurrences) in a date range',
        description:
          '**Sales or admin.** Returns reminder occurrences expanded within `[from, to]` (recurring reminders yield one event per occurrence). Range is capped at 92 days.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'from',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date-time', example: '2026-07-01T00:00:00Z' },
          },
          {
            name: 'to',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date-time', example: '2026-07-31T23:59:59Z' },
          },
          {
            name: 'agent',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Filter by assigned member id.',
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['PENDING', 'IN_PROGRESS', 'FOLLOWUP', 'COMPLETED', 'CANCELLED'],
            },
          },
        ],
        responses: {
          200: {
            description: 'Calendar events in range',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/CalendarEvent' },
                        },
                        from: { type: 'string', format: 'date-time' },
                        to: { type: 'string', format: 'date-time' },
                        totalItems: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required' },
          403: { description: 'Insufficient role (sales or admin required)' },
          422: { description: 'Validation failed (missing/invalid dates or range > 92 days)' },
        },
      },
    },
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
          'Inbound WhatsApp events (text, document, image). Document/image files are downloaded from Meta and stored under `/uploads/...` with `mediaUrl` on message records. Requires `WHATSAPP_ACCESS_TOKEN`. When `WHATSAPP_APP_SECRET` is set, requests must include a valid `X-Hub-Signature-256` header.',
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
        summary: 'Login (real password OR dev stub)',
        description:
          'Real auth: send `{ email, password }` — looks up Member by `personalEmail`, verifies bcrypt hash, derives JWT role from `departmentRoles[].department` (case-insensitive): **Admin → admin, Sales → sales, Purchase → purchase, Account / Accounts / Accounting → account, else → user**. First-match wins. Tokens embed `tokenVersion` so password resets and admin-driven changes invalidate prior sessions. Returns 401 (generic) when credentials are invalid, the member is not `invitationStatus=active`, or `employmentStatus !== active`.\n\nDev stub: when no `password` is provided AND `NODE_ENV !== production`, returns synthetic tokens for the given `userId`/`email`/`role` (used by tests/local). Returns 501 in production.',
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
    '/api/v1/auth/token/validate': {
      get: {
        tags: ['Auth'],
        summary: 'Validate invite / reset token (public)',
        description:
          'Public endpoint used by the frontend to validate a single-use token before rendering the password form. Returns the token purpose, masked email, and expiry. Token state is checked: 400 for malformed/unknown, 410 for already-used or expired.',
        parameters: [
          {
            name: 'token',
            in: 'query',
            required: true,
            schema: { type: 'string', pattern: '^[a-f0-9]{64}$' },
          },
          {
            name: 'purpose',
            in: 'query',
            required: true,
            schema: { type: 'string', enum: ['invite', 'reset'] },
          },
        ],
        responses: {
          200: {
            description: 'Token is valid',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: { $ref: '#/components/schemas/TokenValidateResponse' },
                  },
                },
              },
            },
          },
          400: { description: 'Token malformed or unknown' },
          410: { description: 'Token already used or expired' },
          422: { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/auth/set-password': {
      post: {
        tags: ['Auth'],
        summary: 'Set password (invite flow, public)',
        description:
          'Completes the admin-invite flow. Hashes the password with bcrypt (cost 12), sets `passwordHash`, marks `invitationStatus=active`, stamps `passwordSetAt`, consumes the token, and invalidates other open invite tokens. Rate-limited (10 / 15 min / IP).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SetPasswordRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Password set; member is now active' },
          400: { description: 'Token malformed or member missing' },
          410: { description: 'Token already used or expired' },
          422: { description: 'Validation failed (weak password or missing fields)' },
          429: { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/v1/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Forgot password (public, always 200)',
        description:
          'Issues a 1-hour `reset` token + sends an email if the member exists and is active. ALWAYS returns 200 with a generic message to prevent email enumeration. Rate-limited (5 / 15 min / IP).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ForgotPasswordRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Acknowledged (generic message — does not reveal account state)' },
          422: { description: 'Validation failed' },
          429: { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/v1/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password (public)',
        description:
          'Completes the forgot-password flow. Refuses if new password equals current hash. On success bumps `Member.tokenVersion` (invalidating all prior JWTs), consumes the token, and invalidates other open reset tokens. Rate-limited (10 / 15 min / IP).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResetPasswordRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Password updated; all prior sessions invalidated' },
          400: { description: 'Token malformed or member missing' },
          410: { description: 'Token already used or expired' },
          422: { description: 'Validation failed (weak password, or same-as-old)' },
          429: { description: 'Rate limit exceeded' },
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
              enum: ['PENDING', 'IN_PROGRESS', 'FOLLOWUP', 'COMPLETED', 'CANCELLED'],
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
    '/api/v1/inquiries/checklist-priority-defaults': {
      get: {
        tags: ['Inquiries'],
        summary: 'Checklist priority due-date defaults',
        description:
          'Returns server-defined due-date offsets for checklist priorities: HIGH 15 minutes, MEDIUM 8 hours, LOW 24 hours from assignment time.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Priority defaults',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        priorities: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/ChecklistPriorityDefault' },
                        },
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
    '/api/v1/inquiries/by-phone': {
      get: {
        tags: ['Inquiries'],
        summary: 'Search inquiries by phone number',
        description:
          'Returns a paginated list of inquiries matching `phoneNumber.number`, optionally scoped by `countryCode`. Same response shape as GET /inquiries.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'number',
            in: 'query',
            required: true,
            schema: { type: 'string', pattern: '^\\d{5,15}$', example: '9876543210' },
            description: 'Phone number, digits only (5–15).',
          },
          {
            name: 'countryCode',
            in: 'query',
            required: false,
            schema: { type: 'string', example: '+91' },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
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
            description: 'Matching inquiries',
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
          422: { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/amendments/search': {
      get: {
        tags: ['Amendments'],
        summary: 'Search amendments (Manage Amendment screen)',
        description:
          'Returns a paginated list of amendments across all inquiries. All filters are optional and combined with AND. Only fields stored on the Amendment model are filterable; UI fields not modeled (Journey/Fare/Channel Type, Booking ID, etc.) are not supported.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'amendmentId',
            in: 'query',
            required: false,
            schema: { type: 'string', example: 'TAIR12345' },
            description: 'Partial, case-insensitive match on amendment id.',
          },
          {
            name: 'amendmentType',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['re_issue', 'cancelation', 'booking'] },
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['followup', 'pending', 'loss', 'completed'] },
          },
          {
            name: 'processedFrom',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date-time' },
            description: 'Filter processedAt >= this ISO date.',
          },
          {
            name: 'processedTo',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date-time' },
            description: 'Filter processedAt <= this ISO date.',
          },
          {
            name: 'createdFrom',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date-time' },
            description: 'Filter createdAt (Generated Time) >= this ISO date.',
          },
          {
            name: 'createdTo',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date-time' },
            description: 'Filter createdAt (Generated Time) <= this ISO date.',
          },
          {
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string', example: 'TAIR' },
            description: 'General text search over amendment id (fallback for amendmentId).',
          },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              default: '-createdAt',
              description:
                'Sort field. Prefix with - for descending (e.g. -createdAt, -processedAt, amendmentId).',
            },
          },
        ],
        responses: {
          200: {
            description: 'Matching amendments',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        items: { type: 'array', items: { $ref: '#/components/schemas/Amendment' } },
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
          403: { description: 'Insufficient role (sales or admin required)' },
          422: { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/inquiries/{id}': {
      get: {
        tags: ['Inquiries'],
        summary: 'Get inquiry by ID',
        description:
          'Returns inquiry detail with `amendments[]` metadata only (newest first). Load WhatsApp chat on card expand via `GET .../amendments/{amendmentId}/messages`; load notes via `GET .../amendments/{amendmentId}/notes`.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: '507f1f77bcf86cd799439011' },
          },
        ],
        responses: {
          200: {
            description: 'Inquiry with amendments',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        inquiry: {
                          type: 'object',
                          properties: {
                            amendments: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/Amendment' },
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
          400: { description: 'Invalid inquiry id' },
          401: { description: 'Authentication required' },
          404: { description: 'Inquiry not found' },
        },
      },
    },
    '/api/v1/inquiries/{id}/assign': {
      patch: {
        tags: ['Inquiries'],
        summary: 'Assign / reassign an inquiry to a member',
        description:
          "Assigns the inquiry to a single member (overwrites any existing assignee), taking it off every other user's list. Only admin and sales roles may assign. Non-admin callers then see only unassigned inquiries plus ones assigned to themselves.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: '507f1f77bcf86cd799439011' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId'],
                properties: {
                  userId: {
                    type: 'string',
                    description: 'Member id to assign the inquiry to',
                    example: '507f191e810c19729de860ea',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Inquiry assigned; returns the updated inquiry' },
          401: { description: 'Authentication required' },
          403: { description: 'Insufficient role (admin or sales required)' },
          404: { description: 'Inquiry or member not found' },
          422: { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/inquiries/{id}/status': {
      patch: {
        tags: ['Inquiries'],
        summary: 'Update an inquiry status',
        description:
          'Updates the inquiry status to one of PENDING, IN_PROGRESS, FOLLOWUP, COMPLETED, or CANCELLED. Only admin and sales roles may update.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: '507f1f77bcf86cd799439011' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['PENDING', 'IN_PROGRESS', 'FOLLOWUP', 'COMPLETED', 'CANCELLED'],
                    example: 'IN_PROGRESS',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Status updated; returns the updated inquiry' },
          401: { description: 'Authentication required' },
          403: { description: 'Insufficient role (admin or sales required)' },
          404: { description: 'Inquiry not found' },
          422: { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/inquiries/{inquiryId}/purchase-chats': {
      get: {
        tags: ['Purchase Team Chat'],
        summary: 'List purchase team chat threads for inquiry',
        description:
          '**Sales/admin:** all threads for inquiry. **Purchase:** only threads where JWT user matches member (`employeeId` or `personalEmail`).',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'inquiryId', in: 'path', required: true, schema: { type: 'string' } },
          {
            name: 'purchaseTeamMemberId',
            in: 'query',
            required: false,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'Thread list' },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden' },
          404: { description: 'Inquiry not found' },
        },
      },
      post: {
        tags: ['Purchase Team Chat'],
        summary: 'Open purchase team chat thread',
        description:
          '**Sales/admin only.** Creates thread for inquiry + `purchaseTeamMemberId` (from member directory).',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'inquiryId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PurchaseChatOpenRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Thread opened' },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden' },
          404: { description: 'Inquiry or member not found' },
          422: { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/inquiries/{inquiryId}/purchase-chats/{purchaseTeamMemberId}/uploads': {
      post: {
        tags: ['Purchase Team Chat'],
        summary: 'Upload file for purchase team chat',
        description:
          'Multipart field `file`. PDF, JPEG, JPG, PNG; max 5MB. Returns `mediaUrl` for **POST .../messages** with type document/image.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'inquiryId', in: 'path', required: true, schema: { type: 'string' } },
          {
            name: 'purchaseTeamMemberId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'File uploaded; use mediaUrl in send message' },
          400: { description: 'No file' },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/api/v1/inquiries/{inquiryId}/purchase-chats/{purchaseTeamMemberId}/messages': {
      get: {
        tags: ['Purchase Team Chat'],
        summary: 'Get messages with purchase team member',
        description:
          'Internal CRM chat. Text and file messages include `mediaUrl` for download at `{BASE_URL}{mediaUrl}`.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'inquiryId', in: 'path', required: true, schema: { type: 'string' } },
          {
            name: 'purchaseTeamMemberId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
        ],
        responses: {
          200: { description: 'Paginated messages' },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden' },
          404: { description: 'Not found' },
        },
      },
      post: {
        tags: ['Purchase Team Chat'],
        summary: 'Send message to purchase team member (text / document / image)',
        description:
          '**Sales/admin/purchase.** For files: upload first, then send with `type` document|image and `mediaUrl`.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'inquiryId', in: 'path', required: true, schema: { type: 'string' } },
          {
            name: 'purchaseTeamMemberId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PurchaseChatMessageRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Message sent' },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden' },
          404: { description: 'Not found' },
          422: { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/inquiries/{inquiryId}/amendments/finalize': {
      post: {
        tags: ['Amendments'],
        summary: 'Finalize amendment (create from action button)',
        description:
          '**Sales or admin.** Creates amendment + locks chat. Use after Q&A session (`sessionId`) or without chat. Actions: followup, pending, loss, completed (won).',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'inquiryId',
            in: 'path',
            required: true,
            schema: { type: 'string', example: '507f1f77bcf86cd799439011' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AmendmentFinalizeRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Amendment created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        amendment: { $ref: '#/components/schemas/Amendment' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden (requires sales or admin)' },
          404: { description: 'Inquiry not found' },
          422: { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/inquiries/{inquiryId}/amendments': {
      get: {
        tags: ['Amendments'],
        summary: 'List amendments for inquiry',
        description:
          'Amendment metadata only. Load chat via `GET .../amendments/{amendmentId}/messages` when a card is expanded.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'inquiryId',
            in: 'path',
            required: true,
            schema: { type: 'string', example: '507f1f77bcf86cd799439011' },
          },
        ],
        responses: {
          200: {
            description: 'Amendment list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        amendments: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Amendment' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden' },
          404: { description: 'Inquiry not found' },
        },
      },
    },
    '/api/v1/inquiries/{inquiryId}/amendments/{amendmentId}': {
      get: {
        tags: ['Amendments'],
        summary: 'Get amendment by business ID',
        description:
          'Read-only amendment card metadata (TAIR/TCAN/TBOOK id). Use messages/notes endpoints for chat and notes.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'inquiryId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'amendmentId',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'TAIR59733107042' },
          },
        ],
        responses: {
          200: {
            description: 'Amendment detail',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        amendment: { $ref: '#/components/schemas/Amendment' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden' },
          404: { description: 'Not found' },
        },
      },
    },
    '/api/v1/inquiries/{inquiryId}/amendments/{amendmentId}/messages': {
      get: {
        tags: ['Amendments'],
        summary: 'Get finalized amendment chat (read-only)',
        description:
          'Call when the user expands an amendment card. Paginated Q&A (text, document, image) for a finalized amendment.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'inquiryId', in: 'path', required: true, schema: { type: 'string' } },
          {
            name: 'amendmentId',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'TAIR59733107042' },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
        ],
        responses: {
          200: {
            description: 'Paginated messages',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        amendmentId: { type: 'string' },
                        items: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/AmendmentMessage' },
                        },
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
          403: { description: 'Forbidden' },
          404: { description: 'Not found' },
        },
      },
    },
    '/api/v1/inquiries/{inquiryId}/amendments/{amendmentId}/notes': {
      get: {
        tags: ['Amendments'],
        summary: 'List Q&A notes on finalized amendment',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'inquiryId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'amendmentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Notes list (read-only)' },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden' },
          404: { description: 'Not found' },
        },
      },
    },
    '/api/v1/inquiries/{inquiryId}/amendments/session/{sessionId}/messages': {
      get: {
        tags: ['Amendments'],
        summary: 'Get live session chat (before finalize)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'inquiryId', in: 'path', required: true, schema: { type: 'string' } },
          {
            name: 'sessionId',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
        ],
        responses: {
          200: { description: 'Paginated session messages' },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden' },
          404: { description: 'Session not found or finalized' },
        },
      },
    },
    '/api/v1/inquiries/{inquiryId}/amendments/session/{sessionId}/notes': {
      post: {
        tags: ['Amendments'],
        summary: 'Add Q&A note (before finalize)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'inquiryId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AmendmentNoteRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Note created' },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden' },
          404: { description: 'Session not found' },
          422: { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/inquiries/{inquiryId}/amendments/session/{sessionId}/uploads': {
      post: {
        tags: ['Amendments'],
        summary: 'Upload file for session chat (before finalize)',
        description:
          'Multipart field `file`. PDF, JPEG, JPG, PNG; max 5MB. Returns `mediaUrl` for **POST /whatsapp/send** with type document/image.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'inquiryId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'File uploaded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        mediaUrl: {
                          type: 'string',
                          example: '/uploads/amendments/session/uuid/file.pdf',
                        },
                        fileName: { type: 'string' },
                        mimeType: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'No file or invalid type' },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/api/v1/inquiries/{inquiryId}/payment-plan': {
      get: {
        tags: ['Payments'],
        summary: 'Get payment plan for inquiry',
        description: 'Returns the payment terms (header + installments) for the inquiry.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'inquiryId',
            in: 'path',
            required: true,
            schema: { type: 'string', example: '507f1f77bcf86cd799439011' },
          },
        ],
        responses: {
          200: {
            description: 'Payment plan',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        paymentPlan: { $ref: '#/components/schemas/PaymentPlan' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden (requires sales, account, or admin)' },
          404: { description: 'Inquiry or payment plan not found' },
        },
      },
      put: {
        tags: ['Payments'],
        summary: 'Save (create or overwrite) payment plan',
        description:
          '**Sales, account, or admin.** Upserts one payment plan per inquiry. Upload proofs first via POST .../uploads, then include the returned `paymentProofUrl` per installment. `installments.length` must equal `numberOfInstallments`.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'inquiryId',
            in: 'path',
            required: true,
            schema: { type: 'string', example: '507f1f77bcf86cd799439011' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaymentPlanSaveRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Payment plan saved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        paymentPlan: { $ref: '#/components/schemas/PaymentPlan' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden (requires sales, account, or admin)' },
          404: { description: 'Inquiry not found' },
          422: { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/inquiries/{inquiryId}/payment-plan/uploads': {
      post: {
        tags: ['Payments'],
        summary: 'Upload payment proof file',
        description:
          'Multipart field `file`. PDF, JPEG, JPG, PNG; max 5MB. Returns `paymentProofUrl` to set on an installment in PUT .../payment-plan.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'inquiryId',
            in: 'path',
            required: true,
            schema: { type: 'string', example: '507f1f77bcf86cd799439011' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'File uploaded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        paymentProofUrl: {
                          type: 'string',
                          example:
                            '/uploads/payment-proofs/507f1f77bcf86cd799439011/172000-abc.jpg',
                        },
                        fileName: { type: 'string' },
                        mimeType: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'No file or invalid type' },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden (requires sales, account, or admin)' },
          404: { description: 'Inquiry not found' },
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
    '/api/v1/members/directory': {
      get: {
        tags: ['Members'],
        summary: 'Member directory by department (Talk to Purchase Team)',
        description:
          'Read-only contact list for **sales** and **admin**. Use `department=Purchase` from the sales module (Talk to Purchase Team). Excludes document URLs and home address. Defaults to `employmentStatus=active`.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'department',
            in: 'query',
            required: true,
            schema: { type: 'string', example: 'Purchase' },
            description: 'Department name on member `departmentRoles` (case-insensitive)',
          },
          {
            name: 'role',
            in: 'query',
            required: false,
            schema: { type: 'string', example: 'Executive' },
            description: 'Optional role within that department',
          },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
          {
            name: 'employmentStatus',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['active', 'inactive', 'probation', 'contract', 'terminated'],
              default: 'active',
            },
          },
          { name: 'search', in: 'query', schema: { type: 'string', maxLength: 100 } },
        ],
        responses: {
          200: {
            description: 'Directory list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        department: { type: 'string', example: 'Purchase' },
                        role: { type: 'string', nullable: true },
                        items: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/MemberDirectoryItem' },
                        },
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
          403: { description: 'Forbidden (requires sales or admin)' },
          422: { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/members/name-search': {
      get: {
        tags: ['Members'],
        summary: 'Search member names (autocomplete)',
        description:
          'Lightweight name lookup for pickers / autocomplete. **Sales or admin.** Matches `search` (case-insensitive) against `fullName`, `firstName`, `lastName`, and `employeeId`, returning only identity fields (no PII or document URLs).',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'search',
            in: 'query',
            required: true,
            schema: { type: 'string', minLength: 1, maxLength: 100, example: 'priya' },
            description: 'Search term matched against member name and employeeId.',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 10, minimum: 1, maximum: 25 },
          },
          {
            name: 'employmentStatus',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['active', 'inactive', 'probation', 'contract', 'terminated'],
            },
          },
        ],
        responses: {
          200: {
            description: 'Matching member names',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/MemberNameItem' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden (requires sales or admin)' },
          422: { description: 'Validation failed' },
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
        summary: 'Create member (and send invite email)',
        description:
          'Create a new member record. **Requires `admin` role.**\n\nBy default the backend also (a) creates the member with `invitationStatus=pending`, (b) issues a 72h single-use invite token, (c) sends a `Set your password` email to `inviteEmail || personalEmail` via Resend, and (d) stamps `lastInviteSentAt`. Pass `sendInvite=false` to skip the email; the admin can then call `POST /api/v1/members/{id}/invitations/resend` later.\n\n- **`application/json`:** body matches **MemberCreate** (includes optional `sendInvite`, `inviteEmail`, and optional `*DocumentUrl` as https or `/uploads/members/...`).\n- **`multipart/form-data`:** same fields as plain text; **`phoneNumber`**, **`homePhoneNumber`**, **`officePhoneNumber`**, and **`departmentRoles`** must be **JSON strings**; **`sendInvite`** is sent as `"true"`/`"false"` (coerced server-side); attach optional files **`aadharCard`**, **`panCard`**, **`cancelCheque`** (PDF or image). `createdBy` is never sent by the client.',
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
                  sendInvite: { type: 'string', example: 'true', description: '"true" / "false"' },
                  inviteEmail: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Member created (and invite email sent unless sendInvite=false)',
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
                        invite: { $ref: '#/components/schemas/InviteResult' },
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
    '/api/v1/members/{id}/invitations/resend': {
      post: {
        tags: ['Members'],
        summary: 'Resend invite email',
        description:
          'Re-issues a fresh 72h invite token for a member whose `invitationStatus` is `pending`, invalidates any prior open invite tokens, and re-sends the `Set your password` email. **Requires `admin` JWT.** Rate-limited (5 / minute / IP).',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: '507f1f77bcf86cd799439011' },
          },
        ],
        responses: {
          200: {
            description: 'Invite re-sent',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        member: { type: 'object' },
                        invite: { $ref: '#/components/schemas/InviteResult' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required' },
          403: { description: 'Forbidden (not admin)' },
          404: { description: 'Member not found' },
          409: { description: 'Member is already active' },
          429: { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/v1/members/{id}': {
      get: {
        tags: ['Members'],
        summary: 'Get member by ID',
        description:
          'Returns the full member record for the given MongoDB ObjectId. **Requires `admin` JWT.** `passwordHash` is never included.',
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
            description: 'Member found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        member: { type: 'object', description: 'Full member document' },
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
      patch: {
        tags: ['Members'],
        summary: 'Update member',
        description:
          'Partial update of a member. **Requires `admin` JWT.** Use **`application/json`** (**MemberUpdate**) or **`multipart/form-data`** (same fields as text; nested objects as JSON strings; optional **`aadharCard`**, **`panCard`**, **`cancelCheque`** files).\n\nAttempting to set protected auth fields (`passwordHash`, `invitationStatus`, `tokenVersion`, `lastInviteSentAt`, `passwordSetAt`, `passwordResetAt`, `lastLoginAt`, `loginRole`) returns **422**. Changing `personalEmail` or `employmentStatus` may trigger token-version bumps or automatic invite re-sends — see **MemberUpdate** description.',
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
    '/api/v1/whatsapp/conversations': {
      get: {
        tags: ['WhatsApp'],
        summary: 'List WhatsApp conversations',
        description:
          'Returns one row per customer phone (`peerPhone`) with the latest message and counts. Messages are stored from inbound webhooks and outbound send.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string', maxLength: 100 },
            description: 'Filter peerPhone by substring (digits)',
          },
        ],
        responses: {
          200: { description: 'Paginated conversation list' },
          401: { description: 'Authentication required' },
          422: { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/whatsapp/conversations/{peerPhone}/messages': {
      get: {
        tags: ['WhatsApp'],
        summary: 'List messages in a conversation',
        description:
          'Returns paginated messages for a single `peerPhone` (E.164 digits, no +). Default sort is oldest first (`createdAt`).',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'peerPhone',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^\\d{10,15}$', example: '919876543210' },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          },
          {
            name: 'sort',
            in: 'query',
            schema: { type: 'string', default: 'createdAt', example: '-createdAt' },
            description: 'Sort field: createdAt or waTimestamp; prefix - for descending',
          },
        ],
        responses: {
          200: { description: 'Paginated message thread' },
          401: { description: 'Authentication required' },
          422: { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/whatsapp/send': {
      post: {
        tags: ['WhatsApp'],
        summary: 'Send WhatsApp message (text / document / image)',
        description:
          '**Sales or admin.** Sends via WhatsApp Cloud API. Use **type=template** for first outbound message (customer has not messaged you). Use **type=text** only within 24h after customer messages you. Document/image require prior **session upload** and `PUBLIC_BASE_URL`.',
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
          403: { description: 'Forbidden (requires sales or admin)' },
          422: { description: 'Validation failed' },
          502: { description: 'Graph API error' },
          503: { description: 'WhatsApp or PUBLIC_BASE_URL not configured' },
        },
      },
    },
  },
};

module.exports = spec;
