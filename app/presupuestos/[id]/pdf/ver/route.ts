import { presupuestoPdfResponse } from "../pdf-response";

export const runtime = "nodejs";

type PresupuestoPdfVerRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: PresupuestoPdfVerRouteContext,
) {
  const { id } = await context.params;
  return presupuestoPdfResponse(id, "inline");
}
