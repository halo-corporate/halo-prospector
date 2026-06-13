/**
 * Núcleo do cron de rastreio (PR 4d). Roda SEM sessão de usuário, então usa o
 * cliente admin (service role, ignora RLS). Para cada conta conectada:
 *   1) garante um access_token válido (refresha e grava se preciso);
 *   2) lê os envios pendentes (com pedido no Melhor Envio e ainda não
 *      finalizados);
 *   3) consulta o rastreio em lote e AVANÇA o status (nunca regride), gravando
 *      código de rastreio / URL de acompanhamento quando vierem.
 *
 * O banco continua sendo a fonte de verdade.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { getMelhorEnvioConfig, type MelhorEnvioConfig } from "./config";
import { refreshAccessToken } from "./api";
import {
  consultarRastreio,
  mapMelhorEnvioStatus,
  ENVIO_STATUS_RANK,
} from "./rastreio";
import { type EnvioStatus } from "@/lib/database.types";

const REFRESH_SKEW_MS = 60_000;
const BATCH = 50;

// Status finais — não precisam mais de rastreio.
const STATUS_FINAIS: EnvioStatus[] = ["entregue", "devolvido", "extraviado"];

export interface RastreioCronResult {
  ok: boolean;
  contas: number;
  verificados: number;
  atualizados: number;
  erros: string[];
}

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

interface ConexaoRow {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

/** Garante um access_token válido pra uma conexão, refreshando via admin. */
async function tokenValido(
  admin: AdminClient,
  cfg: MelhorEnvioConfig,
  conexao: ConexaoRow,
): Promise<{ ok: true; accessToken: string } | { ok: false; message: string }> {
  const expiresMs = new Date(conexao.expires_at).getTime();
  if (expiresMs - Date.now() > REFRESH_SKEW_MS) {
    return { ok: true, accessToken: conexao.access_token };
  }
  const refreshed = await refreshAccessToken(cfg, conexao.refresh_token);
  if (!refreshed.ok) {
    return { ok: false, message: `refresh falhou: ${refreshed.message}` };
  }
  const newExpiresAt = new Date(
    Date.now() + refreshed.data.expires_in * 1000,
  ).toISOString();
  const { error } = await admin
    .from("melhor_envio_conexao")
    .update({
      access_token: refreshed.data.access_token,
      refresh_token: refreshed.data.refresh_token,
      token_type: refreshed.data.token_type,
      scope: refreshed.data.scope ?? cfg.scope,
      expires_at: newExpiresAt,
    })
    .eq("user_id", conexao.user_id);
  if (error) console.error("[cron tokenValido] update:", error);
  return { ok: true, accessToken: refreshed.data.access_token };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function atualizarRastreios(): Promise<RastreioCronResult> {
  const result: RastreioCronResult = {
    ok: false,
    contas: 0,
    verificados: 0,
    atualizados: 0,
    erros: [],
  };

  const cfg = getMelhorEnvioConfig();
  if (!cfg) {
    result.erros.push("Melhor Envio não configurado.");
    return result;
  }
  const admin = createAdminClient();
  if (!admin) {
    result.erros.push("SUPABASE_SERVICE_ROLE_KEY ausente — cron não pode rodar.");
    return result;
  }

  const { data: conexoes, error: conErr } = await admin
    .from("melhor_envio_conexao")
    .select("user_id, access_token, refresh_token, expires_at");
  if (conErr) {
    result.erros.push(`Falha ao ler conexões: ${conErr.message}`);
    return result;
  }
  result.contas = conexoes?.length ?? 0;

  for (const conexao of (conexoes ?? []) as ConexaoRow[]) {
    const tok = await tokenValido(admin, cfg, conexao);
    if (!tok.ok) {
      result.erros.push(`conta ${conexao.user_id}: ${tok.message}`);
      continue;
    }

    const { data: envios, error: envErr } = await admin
      .from("envios")
      .select("id, status, melhor_envio_order_id, codigo_rastreio, tracking_url")
      .eq("user_id", conexao.user_id)
      .not("melhor_envio_order_id", "is", null)
      .not("status", "in", `(${STATUS_FINAIS.join(",")})`);
    if (envErr) {
      result.erros.push(`conta ${conexao.user_id}: ler envios: ${envErr.message}`);
      continue;
    }
    if (!envios || envios.length === 0) continue;

    // Mapeia orderId → envio pra casar a resposta do rastreio.
    const porOrder = new Map<string, (typeof envios)[number]>();
    for (const e of envios) {
      if (e.melhor_envio_order_id) porOrder.set(e.melhor_envio_order_id, e);
    }
    const orderIds = [...porOrder.keys()];
    result.verificados += orderIds.length;

    for (const lote of chunk(orderIds, BATCH)) {
      const consulta = await consultarRastreio(cfg, tok.accessToken, lote);
      if (!consulta.ok) {
        result.erros.push(`conta ${conexao.user_id}: rastreio: ${consulta.message}`);
        continue;
      }
      for (const [orderId, info] of Object.entries(consulta.porPedido)) {
        const envio = porOrder.get(orderId);
        if (!envio) continue;

        const patch: {
          status?: EnvioStatus;
          codigo_rastreio?: string;
          tracking_url?: string;
        } = {};

        const novoStatus = mapMelhorEnvioStatus(info.status);
        if (
          novoStatus &&
          ENVIO_STATUS_RANK[novoStatus] > ENVIO_STATUS_RANK[envio.status]
        ) {
          patch.status = novoStatus;
        }
        if (info.codigoRastreio && info.codigoRastreio !== envio.codigo_rastreio) {
          patch.codigo_rastreio = info.codigoRastreio;
        }
        if (info.trackingUrl && info.trackingUrl !== envio.tracking_url) {
          patch.tracking_url = info.trackingUrl;
        }
        if (Object.keys(patch).length === 0) continue;

        const { error: updErr } = await admin
          .from("envios")
          .update(patch)
          .eq("id", envio.id);
        if (updErr) {
          result.erros.push(`envio ${envio.id}: update: ${updErr.message}`);
          continue;
        }
        result.atualizados += 1;
      }
    }
  }

  result.ok = result.erros.length === 0;
  return result;
}
