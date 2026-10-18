'use client'

import { Trash2 } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { ActionResult } from '@/lib/actions'

export function ConfirmDelete({
  name,
  onDelete,
}: {
  name: string
  onDelete: () => Promise<ActionResult>
}) {
  const [pending, start] = useTransition()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label={`${name} sil`} disabled={pending}>
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{name} silinsin mi?</AlertDialogTitle>
          <AlertDialogDescription>
            Bu kayıtla ilişkili geçmiş de silinebilir. Sadece gizlemek istiyorsanız düzenleyip
            pasife alın.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() =>
              start(async () => {
                const r = await onDelete()
                if (r.ok) toast.success(`${name} silindi`)
                else toast.error(r.error)
              })
            }
          >
            Sil
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
