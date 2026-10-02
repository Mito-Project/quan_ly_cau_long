"use client";
import { useParams } from "next/navigation";
import MealForm from "@/components/MealForm";
export default function Page() {
  const { teamId } = useParams<{ teamId: string }>();
  return <MealForm teamId={teamId} />;
}
