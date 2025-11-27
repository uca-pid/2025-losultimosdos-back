// types/class.ts

export interface ClassInput {
  name: string;
  description: string;
  date: string;
  time: string;
  capacity: number;
  sedeId: number;
  // 👇 nuevo campo opcional en el input
  isBoostedForPoints?: boolean;
}

// Para enroll
export interface ClassEnrollment {
  classId: number;
}

// GymClass que representa lo que viene de la DB / API
// Hacemos un Omit para que el flag sea obligatorio acá
export interface GymClass
  extends Omit<ClassInput, "isBoostedForPoints"> {
  id: number;
  createdById: string;
  users: string[];
  enrolled: number;
  // 👇 en la clase real siempre existe y es boolean
  isBoostedForPoints: boolean;
}
