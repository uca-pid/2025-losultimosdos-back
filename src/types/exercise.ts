export interface ExerciseInput {
    name: string;
    equipment?: string;
    muscleGroupId?: number;
    description?: string;
    videoUrl?: string;
}
export interface ExerciseUpdateInput {
    name?: string;
    equipment?: string;
    muscleGroupId?: number;
    description?: string;
    videoUrl?: string;

}
export interface Exercise extends ExerciseInput {
    id: number;
    equipment?: string;
    muscleGroupId?: number;
    description?: string;
    videoUrl?: string;
}
