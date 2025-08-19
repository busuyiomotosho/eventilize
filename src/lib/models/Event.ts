import mongoose, { Document, Schema } from 'mongoose'
import type { IGuest } from './Guest';

export interface ITable {
  id: string
  name: string
  shape: 'round' | 'rectangular'
  capacity: number
  x: number
  y: number
  rotation: number
  assignedGuests: string[]
}

export interface IEvent extends Document {
  name: string;
  date: string;
  time: string;
  location: string;
  strategy: 'self-registration' | 'organizer-list';
  maxCapacity?: number;
  tables: ITable[];
  guests: IGuest[];
  qrCode: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TableSchema = new Schema<ITable>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  shape: { 
    type: String, 
    required: true, 
    enum: ['round', 'rectangular'] 
  },
  capacity: { type: Number, required: true, min: 1 },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  rotation: { type: Number, default: 0 },
  assignedGuests: [{ type: String }]
})

import { GuestSchema } from './Guest';

const EventSchema = new Schema<IEvent>(
  {
    name: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
    },
    date: {
      type: String,
      required: [true, 'Event date is required'],
    },
    time: {
      type: String,
      required: [true, 'Event time is required'],
    },
    location: {
      type: String,
      required: [true, 'Event location is required'],
      trim: true,
    },
    strategy: {
      type: String,
      required: [true, 'Guest management strategy is required'],
      enum: ['self-registration', 'organizer-list'],
    },
    maxCapacity: {
      type: Number,
      min: 1,
    },
    tables: [TableSchema],
    guests: [GuestSchema],
    qrCode: {
      type: String,
      required: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Create indexes
EventSchema.index({ createdBy: 1 })
EventSchema.index({ qrCode: 1 })

export default mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema) 