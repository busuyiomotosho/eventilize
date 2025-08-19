# Eventilize - Event Guest Management System

A comprehensive Next.js 15 application for managing event guest registration, seating arrangements, and on-site check-in with QR codes.

## Features

- **User Authentication**: Secure login/register with NextAuth.js
- **Event Management**: Create and manage events with different guest strategies
- **Guest Registration**: Self-registration or organizer-managed guest lists
- **QR Code System**: Generate and scan QR codes for check-in
- **Hall Layout Designer**: Visual drag-and-drop table arrangement
- **Real-time Analytics**: Dashboard with attendance tracking and reports
- **Mobile-First Design**: Responsive UI optimized for all devices
- **CSV Import/Export**: Bulk guest management capabilities

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js
- **QR Codes**: qrcode library
- **Charts**: Chart.js with react-chartjs-2
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation

## Prerequisites

- Node.js 18+ 
- MongoDB database (local or cloud)
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd eventilize
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/eventilize
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
eventilize/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── events/        # Event management APIs
│   │   │   └── users/         # User management APIs
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Dashboard page
│   │   └── events/            # Event management pages
│   ├── components/            # Reusable React components
│   │   ├── auth/              # Authentication components
│   │   ├── common/            # Common UI components
│   │   ├── dashboard/         # Dashboard components
│   │   └── events/            # Event management components
│   ├── lib/                   # Utility libraries
│   │   ├── models/            # MongoDB models
│   │   ├── auth.ts            # NextAuth configuration
│   │   └── db.ts              # Database connection
│   └── types/                 # TypeScript type definitions
├── public/                    # Static assets
├── package.json               # Dependencies and scripts
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
└── next.config.ts             # Next.js configuration
```

## Key Features Implementation

### 1. Authentication System
- NextAuth.js with credentials provider
- Password hashing with bcryptjs
- Protected routes and API endpoints
- Session management

### 2. Event Creation Wizard
- Multi-step form with progress tracking
- Guest management strategy selection
- Hall layout designer with drag-and-drop
- Real-time validation

### 3. Guest Management
- Self-registration with public links
- Manual guest entry and CSV import
- QR code generation for each guest
- Table assignment system

### 4. QR Code System
- Individual guest QR codes for self-registration
- Event QR codes for organizer-managed events
- Mobile-optimized QR scanner
- Secure check-in verification

### 5. Hall Layout Designer
- Visual drag-and-drop interface
- Multiple table shapes and sizes
- Real-time capacity tracking
- Guest assignment visualization

### 6. Analytics Dashboard
- Real-time attendance tracking
- Chart.js visualizations
- Export functionality
- Performance metrics

## API Endpoints

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth.js endpoints
- `POST /api/users/register` - User registration

### Events
- `GET /api/events` - Fetch user's events
- `POST /api/events` - Create new event
- `GET /api/events/stats` - Dashboard statistics
- `GET /api/events/[id]` - Get specific event
- `PUT /api/events/[id]` - Update event
- `DELETE /api/events/[id]` - Delete event

### Guests
- `GET /api/events/[id]/guests` - Get event guests
- `POST /api/events/[id]/guests` - Add guest
- `PUT /api/events/[id]/guests/[guestId]` - Update guest
- `DELETE /api/events/[id]/guests/[guestId]` - Delete guest

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  createdAt: Date,
  updatedAt: Date
}
```

### Events Collection
```javascript
{
  _id: ObjectId,
  name: String,
  date: String,
  time: String,
  location: String,
  strategy: String ('self-registration' | 'organizer-list'),
  maxCapacity: Number (optional),
  tables: Array,
  qrCode: String,
  createdBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

### Guests Collection
```javascript
{
  _id: ObjectId,
  eventId: ObjectId (ref: Event),
  name: String,
  email: String (optional),
  phone: String (optional),
  dietary: String (optional),
  notes: String (optional),
  checkedIn: Boolean,
  checkInTime: Date (optional),
  assignedTable: String (optional),
  qrCode: String,
  registeredBy: String ('guest' | 'organizer'),
  registrationTime: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Development

### Running in Development
```bash
npm run dev
```

### Building for Production
```bash
npm run build
npm start
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

## Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
- Ensure MongoDB connection string is set
- Set NEXTAUTH_SECRET and NEXTAUTH_URL
- Build and deploy using platform-specific instructions

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `NEXTAUTH_SECRET` | Secret key for NextAuth.js | Yes |
| `NEXTAUTH_URL` | Base URL for NextAuth.js | Yes |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue on GitHub or contact the development team.

## Demo Account

For testing purposes, you can use the demo account:
- Email: demo@example.com
- Password: password123

---

Built with ❤️ using Next.js 15, TypeScript, and Tailwind CSS
