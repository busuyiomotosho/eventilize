import mongoose, { Schema } from 'mongoose';

export interface IImportJob extends mongoose.Document {
  eventId: string;
  csvText: string;
  mapping: Record<string, string>;
  createMissingTables: boolean;
  status: 'pending' | 'running' | 'done' | 'failed' | 'cancelled';
  progress: number; // 0-100
  matchedCount: number;
  unmatchedCount: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ImportJobSchema = new Schema<IImportJob>({
  eventId: { type: String, required: true },
  csvText: { type: String, required: true },
  mapping: { type: Schema.Types.Mixed, default: {} },
  createMissingTables: { type: Boolean, default: false },
  status: { type: String, enum: ['pending','running','done','failed','cancelled'], default: 'pending' },
  progress: { type: Number, default: 0 },
  matchedCount: { type: Number, default: 0 },
  unmatchedCount: { type: Number, default: 0 },
  errorMessage: { type: String },
}, { timestamps: true });

export default mongoose.models.ImportJob || mongoose.model<IImportJob>('ImportJob', ImportJobSchema);
