// Marcador temporário das rotas ainda não implementadas.
// Removido conforme as páginas reais forem entregues nas próximas fases.
export function PagePlaceholder({ title, task }: { title: string; task: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="text-muted-foreground text-sm">Em construção — tarefa {task} do plano.</p>
    </div>
  )
}
