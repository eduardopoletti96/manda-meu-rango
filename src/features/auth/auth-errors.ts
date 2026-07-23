import type { AuthError } from '@supabase/supabase-js'

// Mensagens em PT-BR para os erros mais comuns do Supabase Auth.
// A correspondência é feita pelo `code` estável da API; o fallback por
// mensagem cobre versões antigas que não enviavam código.
const byCode: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'E-mail ainda não confirmado. Verifique sua caixa de entrada.',
  user_not_found: 'E-mail ou senha incorretos.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde um instante e tente de novo.',
  over_email_send_rate_limit: 'Limite de e-mails atingido. Aguarde alguns minutos e tente de novo.',
  weak_password: 'A senha deve ter pelo menos 6 caracteres.',
  same_password: 'A nova senha precisa ser diferente da atual.',
  otp_expired: 'O link expirou. Solicite um novo.',
  email_exists: 'Já existe uma conta com este e-mail.',
  user_already_exists: 'Já existe uma conta com este e-mail.',
}

export function authErrorMessage(error: AuthError): string {
  if (error.code && byCode[error.code]) {
    return byCode[error.code]
  }
  if (error.message.includes('Invalid login credentials')) {
    return byCode.invalid_credentials
  }
  return 'Não foi possível concluir a operação. Tente de novo em instantes.'
}
