"use client";
import { useParams } from "next/navigation";
import MealForm from "@/components/MealForm";
export default function Page() {
  const { teamId, id } = useParams<{ teamId: string; id: string }>();
  return <MealForm teamId={teamId} mealId={id} />;
}
