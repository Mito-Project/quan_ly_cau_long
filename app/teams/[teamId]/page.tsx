import { redirect } from "next/navigation";
export default function Page({ params }: { params: { teamId: string } }) {
  redirect(`/teams/${params.teamId}/sessions`);
}
