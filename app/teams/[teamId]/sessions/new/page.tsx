"use client";
import { useParams } from "next/navigation";
import SessionForm from "@/components/SessionForm";
export default function Page() {
  const { teamId } = useParams<{ teamId: string }>();
  return <SessionForm teamId={teamId} />;
}
