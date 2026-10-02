"use client";
import { useParams } from "next/navigation";
import SessionForm from "@/components/SessionForm";
export default function Page() {
  const { teamId, id } = useParams<{ teamId: string; id: string }>();
  return <SessionForm teamId={teamId} sessionId={id} />;
}
