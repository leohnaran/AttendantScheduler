import React, { useEffect, useState } from 'react'
import { t } from '../i18n/translations'
import { getAssignId } from '../utils/helpers'

// --- DEPENDENCY: checkQualification ---
function checkQualification(p, pos, shiftId, areas, tags, personnel) {
  let qualified = true
  let reason = null
  const area = areas.find((a) => a.id === pos.areaId)
  const requiredCap = area ? area.capability : ''

  let limitType = pos.limitType
  let limitValue = pos.limitValue
  if (!limitType && pos.teamKeyManId) {
    limitType = 'keyman'
    limitValue = pos.teamKeyManId
  }
  if (!limitType && area && area.limitType) {
    limitType = area.limitType
    limitValue = area.limitValue
  }

  if (limitType && limitValue) {
    if (limitType === 'keyman') {
      if (p.keyManId !== parseInt(limitValue)) {
        qualified = false
        const km = personnel.find((x) => x.id === parseInt(limitValue))
        reason = `Restricted to Team: ${km ? km.name : limitValue}`
      }
    } else if (limitType === 'congregation') {
      if (p.congregation !== limitValue) {
        qualified = false
        reason = `Restricted to Congregation: ${limitValue}`
      }
    } else if (limitType === 'tag') {
      if (!p.tags || !p.tags.includes(limitValue)) {
        qualified = false
        const tObj = tags.find((x) => x.id === limitValue)
        reason = `Restricted to Tag: ${tObj ? tObj.name : limitValue}`
      }
    } else if (limitType === 'role') {
      if (p.role !== limitValue) {
        qualified = false
        reason = `Restricted to Role: ${limitValue}`
      }
    }
  }

  if (qualified && tags && p.tags) {
    for (let tid of p.tags) {
      const tag = tags.find((t) => t.id === tid)
      if (tag) {
        if (tag.restrictedAreas && tag.restrictedAreas.includes(pos.areaId)) {
          qualified = false
          reason = `Restricted by your Tag: ${tag.name} (Area)`
          break
        }
        if (tag.restrictedShifts) {
          if (tag.restrictedShifts.includes(shiftId)) {
            qualified = false
            reason = `Restricted by your Tag: ${tag.name} (Shift)`
            break
          }
          if (shiftId === 'all' && tag.restrictedShifts.includes('all_day')) {
            qualified = false
            reason = `Restricted by your Tag: ${tag.name} (All Day)`
            break
          }
        }
      }
    }
  }

  if (qualified) {
    if (requiredCap && (!p.caps || !p.caps.includes(requiredCap))) {
      qualified = false
      reason = `Missing Capability: ${area ? area.name : 'Unknown'}`
    } else if (pos.keyMan && (!p.caps || !p.caps.includes('keyman'))) {
      qualified = false
      reason = `Not a Key Man`
    }
  }

  return { qualified, reason }
}

export default function FindReplacementModal({
  slot,
  personnel,
  assignments,
  areas,
  positions,
  shifts,
  tags,
  onAssign,
  onClose,
  language,
}) {
  const [candidates, setCandidates] = useState([])

  useEffect(() => {
    if (!slot) return
    const { pos, shiftId } = slot

    const initialList = personnel.map((p) => {
      const { qualified, reason } = checkQualification(p, pos, shiftId, areas, tags, personnel)
      let isBusy = false
      let busyWhere = null
      let busySlot = null

      for (let otherPos of positions) {
        if (otherPos.type === 'auditorium' && getAssignId(assignments[otherPos.id]) === p.id) {
          isBusy = true
          busyWhere = otherPos.name
          busySlot = { pos: otherPos, shiftId: 'all' }
          break
        }

        if (otherPos.type === 'rotational' && !otherPos.isMirror) {
          if (otherPos.validShifts && !otherPos.validShifts.includes(shiftId)) continue
          if (getAssignId(assignments[`${otherPos.id}_${shiftId}`]) === p.id) {
            isBusy = true
            busyWhere = otherPos.name
            busySlot = { pos: otherPos, shiftId: shiftId }
            break
          }
        }
      }

      if (!isBusy && p.unavailable && p.unavailable.includes(shiftId)) {
        isBusy = true
        busyWhere = 'Marked Unavailable'
        busySlot = null
      }

      return { ...p, qualified, reason, isBusy, busyWhere, busySlot }
    })

    const freePeople = initialList.filter(p => !p.isBusy)

    const finalCandidates = initialList.map(p => {
      if (p.qualified && p.isBusy && p.busySlot) {
        let replacementForP = null;
        for (let fp of freePeople) {
          if (fp.id === p.id) continue;
          const fpEval = checkQualification(fp, p.busySlot.pos, p.busySlot.shiftId, areas, tags, personnel);
          if (fpEval.qualified) {
            replacementForP = fp;
            break;
          }
        }

        if (replacementForP) {
          return { ...p, isDominoSwap: true, dominoData: { replacementId: replacementForP.id, replacementName: replacementForP.name, pos: p.busySlot.pos, shiftId: p.busySlot.shiftId } }
        }
      }
      return p;
    });

    finalCandidates.sort((a, b) => {
      const aValidFree = a.qualified && !a.isBusy;
      const bValidFree = b.qualified && !b.isBusy;
      if (aValidFree && !bValidFree) return -1;
      if (bValidFree && !aValidFree) return 1;

      if (a.isDominoSwap && !b.isDominoSwap) return -1;
      if (b.isDominoSwap && !a.isDominoSwap) return 1;

      const aQualBusy = a.qualified && a.isBusy && !a.isDominoSwap;
      const bQualBusy = b.qualified && b.isBusy && !b.isDominoSwap;
      if (aQualBusy && !bQualBusy) return -1;
      if (bQualBusy && !aQualBusy) return 1;

      if (a.qualified && !b.qualified) return -1;
      if (b.qualified && !a.qualified) return 1;

      return a.name.localeCompare(b.name);
    })

    setCandidates(finalCandidates)
  }, [slot, personnel, assignments, areas, positions, shifts, tags])

  if (!slot) return null

  const { pos, shiftId } = slot

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg h-3/4 flex flex-col border border-gray-100 transform transition-all scale-100 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-xl text-gray-900 tracking-tight dark:text-white">
              {t('grid_find_replacement', language)}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pos.name} •{' '}
              {shiftId === 'all'
                ? t('grid_all_day', language)
                : shifts.find((s) => s.id === shiftId)?.label}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors dark:bg-slate-800 dark:text-gray-400 dark:hover:text-white"
          >
            <i className="fa fa-times"></i>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 border border-gray-100 rounded-2xl p-2 bg-gray-50/50 shadow-inner dark:bg-slate-800/50 dark:border-slate-800">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {candidates.map((p) => (
                <tr
                  key={p.id}
                  className={`bg-white dark:bg-slate-900 transition-colors ${p.qualified ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer' : 'opacity-60'
                    }`}
                  onClick={() => p.qualified && (!p.isBusy || p.isDominoSwap) && onAssign(pos, shiftId, p.id, p.isDominoSwap ? p.dominoData : null)}
                >
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className={`font-bold ${p.qualified ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                        {p.name}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-black tracking-tighter">
                        {p.role}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    {!p.qualified ? (
                      <div className="text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-100 font-bold dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                        <i className="fa fa-ban mr-1"></i> {p.reason}
                      </div>
                    ) : p.isDominoSwap ? (
                      <div className="text-[10px] text-orange-600 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100 font-bold dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400">
                        <i className="fa fa-exchange-alt mr-1"></i> Swap with {p.dominoData.replacementName} (to cover {p.busyWhere})
                      </div>
                    ) : p.isBusy ? (
                      <div className="text-[10px] text-yellow-600 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100 font-bold dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400">
                        <i className="fa fa-clock mr-1"></i> Busy: {p.busyWhere}
                      </div>
                    ) : (
                      <div className="text-[10px] text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100 font-bold dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
                        <i className="fa fa-check mr-1"></i> Recommended
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {p.qualified && !p.isBusy && (
                      <button className="bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase hover:bg-green-600 shadow-sm shadow-green-200 dark:shadow-none transition-all active:scale-95">
                        {t('btn_assign', language) || 'Assign'}
                      </button>
                    )}
                    {p.isDominoSwap && (
                      <button className="bg-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase hover:bg-orange-600 shadow-sm shadow-orange-200 dark:shadow-none transition-all active:scale-95">
                        Swap
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
