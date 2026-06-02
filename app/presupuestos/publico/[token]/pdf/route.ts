import { presupuestoPdfResponseByToken } from "../../../[id]/pdf/pdf-response";

export const runtime = "nodejs";

type PresupuestoPublicPdfRouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(
  _request: Request,
  context: PresupuestoPublicPdfRouteContext,
) {
  const { token } = await context.params;
  return presupuestoPdfResponseByToken(token, "attachment");
}
