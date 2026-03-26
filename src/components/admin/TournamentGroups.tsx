'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, X, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { GroupWithTeams, TeamCategory } from '@/types'

interface Props {
  editionId: string
  category: TeamCategory
  groups: GroupWithTeams[]
  approvedTeams: { id: string; name: string; category: string }[]
  hasGroupMatches: boolean
}

export default function TournamentGroups({ editionId, category, groups, approvedTeams, hasGroupMatches }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Teams not yet assigned to any group in this category
  const assignedTeamIds = new Set(
    groups.flatMap(g => g.group_teams.flatMap(gt => gt.teams ? [gt.teams.id] : []))
  )
  const unassignedTeams = approvedTeams.filter(
    t => t.category === category && !assignedTeamIds.has(t.id)
  )

  async function createGroup() {
    setSaving(true)
    const nextName = String.fromCharCode(65 + groups.length)
    await supabase.from('groups').insert({
      edition_id: editionId,
      category,
      name: nextName,
      sort_order: groups.length,
    })
    router.refresh()
    setSaving(false)
  }

  async function deleteGroup(groupId: string) {
    if (!window.confirm('Eliminare questo girone? Verranno eliminate anche le squadre assegnate.')) return
    setSaving(true)
    await supabase.from('groups').delete().eq('id', groupId)
    router.refresh()
    setSaving(false)
  }

  async function assignTeam(groupId: string, teamId: string) {
    if (!teamId) return
    setSaving(true)
    await supabase.from('group_teams').insert({ group_id: groupId, team_id: teamId })
    router.refresh()
    setSaving(false)
  }

  async function removeTeam(groupTeamId: string) {
    setSaving(true)
    await supabase.from('group_teams').delete().eq('id', groupTeamId)
    router.refresh()
    setSaving(false)
  }

  async function generateMatches() {
    if (hasGroupMatches) {
      if (!window.confirm('Partite già generate per questa categoria. Rigenerare? Le partite esistenti saranno eliminate.')) return
      await supabase.from('matches').delete()
        .eq('edition_id', editionId)
        .eq('category', category)
        .eq('phase', 'group')
    }

    const allMatches: object[] = []
    let sortOrder = 0
    for (const group of groups) {
      const teamIds = group.group_teams.flatMap(gt => gt.teams ? [gt.teams.id] : [])
      for (let i = 0; i < teamIds.length; i++) {
        for (let j = i + 1; j < teamIds.length; j++) {
          allMatches.push({
            edition_id: editionId,
            category,
            phase: 'group',
            group_id: group.id,
            team_home_id: teamIds[i],
            team_away_id: teamIds[j],
            status: 'scheduled',
            sort_order: sortOrder++,
          })
        }
      }
    }

    if (allMatches.length > 0) {
      setSaving(true)
      await supabase.from('matches').insert(allMatches)
      setSaving(false)
    }
    router.refresh()
  }

  if (groups.length === 0 && unassignedTeams.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-court-gray mb-4">Nessuna squadra approvata per questa categoria.</p>
        <p className="text-court-muted text-sm">Approva le squadre dalla sezione Squadre prima di creare i gironi.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Group cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {groups.map(group => (
          <div key={group.id} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold uppercase text-brand-orange">Girone {group.name}</h3>
                <span className="text-court-muted text-xs">{group.group_teams.length} squadre</span>
              </div>
              <button
                onClick={() => deleteGroup(group.id)}
                disabled={saving}
                className="text-court-muted hover:text-red-400 transition-colors p-1"
                aria-label="Elimina girone"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Team list */}
            <div className="space-y-1 mb-3 min-h-[2rem]">
              {group.group_teams.map(gt => (
                <div key={gt.id} className="flex items-center justify-between text-sm">
                  <span className="text-court-light">{gt.teams?.name}</span>
                  <button
                    onClick={() => removeTeam(gt.id)}
                    disabled={saving}
                    className="text-court-muted hover:text-red-400 transition-colors ml-2"
                    aria-label="Rimuovi squadra"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {group.group_teams.length === 0 && (
                <p className="text-court-muted text-xs italic">Nessuna squadra</p>
              )}
            </div>

            {/* Add team dropdown */}
            {unassignedTeams.length > 0 && (
              <select
                className="input py-1.5 px-2 text-sm w-full"
                value=""
                onChange={e => assignTeam(group.id, e.target.value)}
                disabled={saving}
              >
                <option value="">+ Aggiungi squadra&hellip;</option>
                {unassignedTeams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={createGroup}
          disabled={saving}
          className="btn-ghost text-sm px-4 py-2 flex items-center gap-2"
        >
          <Plus size={14} /> Nuovo Girone
        </button>

        {groups.length > 0 && groups.some(g => g.group_teams.length >= 2) && (
          <button
            onClick={generateMatches}
            disabled={saving}
            className="btn-primary text-sm px-4 py-2"
          >
            {hasGroupMatches ? 'Rigenera Partite Girone' : 'Genera Partite Girone'}
          </button>
        )}
      </div>
    </div>
  )
}
