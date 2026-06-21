'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { GroupWithTeams, TeamCategory } from '@/types'

interface Props {
  editionId: string
  category: TeamCategory
  groups: GroupWithTeams[]
  approvedTeams: { id: string; name: string; category: string }[]
  groupsWithMatches: string[]
}

export default function TournamentGroups({ editionId, category, groups, approvedTeams, groupsWithMatches }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(groups.map(g => g.id)))
  const [newGroupName, setNewGroupName] = useState('')
  const groupsWithMatchesSet = new Set(groupsWithMatches)

  const assignedTeamIds = new Set(
    groups.flatMap(g => g.group_teams.flatMap(gt => gt.teams ? [gt.teams.id] : []))
  )
  const unassignedTeams = approvedTeams.filter(
    t => t.category === category && !assignedTeamIds.has(t.id)
  )

  function toggleExpanded(groupId: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(groupId) ? next.delete(groupId) : next.add(groupId)
      return next
    })
  }

  async function createGroup() {
    const name = newGroupName.trim() || String.fromCharCode(65 + groups.length)
    setSaving(true)
    await supabase.from('groups').insert({
      edition_id: editionId,
      category,
      name,
      sort_order: groups.length,
    })
    setNewGroupName('')
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

  async function removeTeam(groupTeamId: string, teamId: string, groupId: string, teamName: string) {
    if (!window.confirm(`Rimuovere ${teamName} dal girone? Verranno eliminate anche le partite del girone che la coinvolgono.`)) return
    setSaving(true)
    await supabase.from('matches').delete()
      .eq('group_id', groupId)
      .or(`team_home_id.eq.${teamId},team_away_id.eq.${teamId}`)
    await supabase.from('group_teams').delete().eq('id', groupTeamId)
    router.refresh()
    setSaving(false)
  }

  async function generateMatches(group: GroupWithTeams) {
    const hasMatches = groupsWithMatchesSet.has(group.id)
    if (hasMatches) {
      if (!window.confirm(`Rigenerare le partite del Girone ${group.name}? Le partite esistenti saranno eliminate.`)) return
      await supabase.from('matches').delete()
        .eq('edition_id', editionId)
        .eq('category', category)
        .eq('phase', 'group')
        .eq('group_id', group.id)
    }

    const teamIds = group.group_teams.flatMap(gt => gt.teams ? [gt.teams.id] : [])
    const allMatches: object[] = []
    let sortOrder = 0
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

    if (allMatches.length > 0) {
      setSaving(true)
      await supabase.from('matches').insert(allMatches)
      setSaving(false)
    }
    router.refresh()
  }

  return (
    <div>
      {/* New group form */}
      <div className="card p-4 mb-3">
        <p className="text-court-gray text-xs font-display uppercase tracking-wide mb-2">Nuovo girone</p>
        <div className="flex gap-2">
          <input
            className="input text-sm py-1.5 flex-1"
            placeholder={`Nome girone (es. ${String.fromCharCode(65 + groups.length)})`}
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createGroup()}
          />
          <button
            className="btn-primary text-sm px-4 py-1.5"
            onClick={createGroup}
            disabled={saving}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {groups.length === 0 && unassignedTeams.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-court-gray mb-1">Nessuna squadra approvata per questa categoria.</p>
          <p className="text-court-muted text-sm">Approva le squadre dalla sezione Squadre prima di creare i gironi.</p>
        </div>
      )}

      <div className="space-y-3 mb-4">
        {groups.map(group => {
          const isExpanded = expanded.has(group.id)
          return (
            <div key={group.id} className="card overflow-hidden">
              {/* Group header */}
              <div
                className="flex items-center px-4 py-3 gap-3 cursor-pointer select-none"
                onClick={() => toggleExpanded(group.id)}
              >
                <span className="font-display font-bold uppercase text-brand-orange text-sm">
                  Girone {group.name}
                </span>
                <span className="text-xs text-court-gray">{group.group_teams.length} squadre</span>
                <div className="flex items-center gap-2 ml-auto" onClick={e => e.stopPropagation()}>
                  {group.group_teams.length >= 2 && (
                    <button
                      onClick={() => generateMatches(group)}
                      disabled={saving}
                      className="btn-ghost text-xs px-3 py-1"
                    >
                      {groupsWithMatchesSet.has(group.id) ? 'Rigenera partite' : 'Genera partite'}
                    </button>
                  )}
                  <button
                    onClick={() => deleteGroup(group.id)}
                    disabled={saving}
                    className="text-court-muted hover:text-red-400 transition-colors p-1"
                    aria-label="Elimina girone"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button className="text-court-gray p-1" onClick={() => toggleExpanded(group.id)}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-court-border">
                  {group.group_teams.length === 0 && unassignedTeams.length === 0 ? (
                    <p className="text-court-muted text-xs italic px-4 py-3">Nessuna squadra</p>
                  ) : (
                    <>
                      {group.group_teams.map(gt => (
                        <div
                          key={gt.id}
                          className="flex items-center gap-3 px-4 py-2.5 border-b border-court-border last:border-b-0"
                        >
                          <span className="text-sm text-court-white flex-1 min-w-0 truncate">{gt.teams?.name}</span>
                          <button
                            onClick={() => removeTeam(gt.id, gt.team_id, gt.group_id, gt.teams?.name ?? '')}
                            disabled={saving}
                            className="text-court-muted hover:text-red-400 transition-colors shrink-0"
                            aria-label="Rimuovi squadra"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                      {unassignedTeams.length > 0 && (
                        <div className="px-4 py-2.5 border-t border-court-border">
                          <select
                            className="input py-1.5 px-2 text-sm w-full"
                            value=""
                            onChange={e => assignTeam(group.id, e.target.value)}
                            disabled={saving}
                          >
                            <option value="">+ Aggiungi squadra…</option>
                            {unassignedTeams.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}
