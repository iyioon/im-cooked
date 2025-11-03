import { CookingSessionClient } from "./client";

interface CookingSessionPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    session?: string;
  }>;
}

export default async function CookingSessionPage({
  params,
  searchParams,
}: CookingSessionPageProps) {
  const { id } = await params;
  const { session } = await searchParams;

  return <CookingSessionClient recipeId={id} sessionId={session || null} />;
}
