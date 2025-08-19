import mongoose, { Document, Schema } from 'mongoose'

export interface IGuest extends Document {
  eventId: mongoose.Types.ObjectId
  name: string
  email?: string
  phone?: string
  dietary?: string
  notes?: string
  checkedIn: boolean
  checkInTime?: Date
  assignedTable?: string
  qrCode: string
  registeredBy: 'guest' | 'organizer'
  registrationTime: Date
  createdAt: Date
  updatedAt: Date
}

export const GuestSchema = new Schema<IGuest>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Guest name is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    dietary: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    checkedIn: {
      type: Boolean,
      default: false,
    },
    checkInTime: {
      type: Date,
    },
    assignedTable: {
      type: String,
    },
    qrCode: {
      type: String,
      required: true,
      unique: true,
    },
    registeredBy: {
      type: String,
      required: true,
      enum: ['guest', 'organizer'],
    },
    registrationTime: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

// Create indexes
GuestSchema.index({ eventId: 1 })
GuestSchema.index({ email: 1 })
GuestSchema.index({ checkedIn: 1 })

export default mongoose.models.Guest || mongoose.model<IGuest>('Guest', GuestSchema) 