// Shared types for event management

export interface Guest {
  _id: string;
  name: string;
  email?: string;
  assignedTable?: string;
  checkedIn?: boolean;
}

export interface Table {
  id: string;
  name: string;
  shape: string;
  capacity: number;
  x: number;
  y: number;
  assignedGuests: string[];
  rotation?: number;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  maxCapacity?: number;
  guests?: Guest[];
  tables?: Table[];
}
