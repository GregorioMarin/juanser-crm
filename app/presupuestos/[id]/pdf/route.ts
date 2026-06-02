import { presupuestoPdfResponse } from "./pdf-response";

export const runtime = "nodejs";

type PresupuestoPdfRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: PresupuestoPdfRouteContext) {
  const { id } = await context.params;
  return presupuestoPdfResponse(id, "attachment");
}
