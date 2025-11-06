export interface ClassInput {
  name: string;
  description: string;
  date: string;
  time: string;
  capacity: number;
  sedeId: number;
}

export interface ClassEnrollment {
  classId: number;
}

export interface GymClass extends ClassInput {
  id: number;
  createdById: string;
  users: string[];
  enrolled: number;
}
