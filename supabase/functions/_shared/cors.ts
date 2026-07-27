// Cabeçalhos e helpers de resposta compartilhados pelas Edge Functions.
// As telas do cliente chamam estas funções direto do navegador, então o
// preflight de CORS precisa ser respondido.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Responde ao preflight; retorna null quando o método não é OPTIONS. */
export function handlePreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return null
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

/** Resposta de erro padronizada: { error: mensagem }. */
export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status)
}
