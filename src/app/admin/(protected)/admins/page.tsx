import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Admin } from '@/types'
import AddAdminForm from '@/components/admin/AddAdminForm'
import Pagination from '@/components/admin/Pagination'
import { Suspense } from 'react'

const PAGE_SIZE = 20

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function AdminsPage({ searchParams }: Props) {
  const sp = await searchParams
  const supabase = await createServerSupabaseClient()

  const page = Math.max(1, Number(sp.page ?? 1))
  const offset = (page - 1) * PAGE_SIZE

  const { data: admins, count } = await supabase
    .from('admins')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)
    .returns<Admin[]>()

  const total = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const roleLabel = { superadmin: 'Super Admin', editor: 'Editor' }

  return (
    <div>
      <div className="mb-10">
        <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">Admins</p>
        <h1 className="font-display font-bold uppercase text-3xl text-court-white">Gestione Admin</h1>
        <p className="text-court-gray text-sm mt-1">
          Aggiungi co-admin. L&apos;utente deve prima registrarsi su Supabase Auth.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        <div>
          <h2 className="font-display font-bold uppercase text-sm tracking-wider text-court-gray mb-4">
            Admin attivi
          </h2>
          <div className="space-y-3">
            {admins?.map(admin => (
              <div key={admin.id} className="card p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-court-white text-sm">{admin.email}</p>
                  <p className="text-court-muted text-xs mt-0.5">
                    Dal {new Date(admin.created_at).toLocaleDateString('it-IT')}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 font-display uppercase tracking-wide border
                  ${admin.role === 'superadmin' ? 'border-brand-dim text-brand-orange' : 'border-court-border text-court-gray'}`}>
                  {roleLabel[admin.role]}
                </span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <Suspense>
              <Pagination page={page} totalPages={totalPages} total={total} />
            </Suspense>
          )}
        </div>

        <div>
          <h2 className="font-display font-bold uppercase text-sm tracking-wider text-court-gray mb-4">
            Aggiungi admin
          </h2>
          <AddAdminForm />
        </div>
      </div>
    </div>
  )
}
