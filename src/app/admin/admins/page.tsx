import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Admin } from '@/types'
import AddAdminForm from '@/components/admin/AddAdminForm'

export default async function AdminsPage() {
  const supabase = createServerSupabaseClient()
  const { data: admins } = await supabase
    .from('admins').select('*')
    .order('created_at', { ascending: true })
    .returns<Admin[]>()

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
