import React from 'react'
import { t } from '../../i18n/translations'
import PersonRow from './PersonRow'

export default function RosterTable({
  groups,
  dragOverGroup,
  handleDragOver,
  handleDrop,
  language,
  rowProps,
}) {
  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div
          key={group.keyMan ? group.keyMan.id : 'none'}
          className={`droppable-group border border-gray-100 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${dragOverGroup === (group.keyMan ? group.keyMan.id : 'none')
              ? 'bg-blue-50/50 ring-2 ring-blue-200 ring-offset-2'
              : 'bg-white'
            }`}
          onDragOver={(e) =>
            handleDragOver(e, group.keyMan ? group.keyMan.id : 'none')
          }
          onDrop={(e) => handleDrop(e, group.keyMan ? group.keyMan.id : null)}
        >
          {/* GROUP HEADER (Title Only) */}
          <div className="bg-gray-100/80 p-3 border-b border-gray-200 flex justify-between items-center backdrop-blur-sm dark:bg-slate-800 dark:border-slate-700">
            <h3 className="font-black uppercase tracking-[0.2em] text-[10px] text-gray-500 flex items-center gap-2 dark:text-gray-400">
              <i className={`fa ${group.keyMan ? 'fa-user-tie' : 'fa-users'}`}></i>
              {group.keyMan
                ? `${group.keyMan.name}'s Team`
                : t('unassigned_no_keyman', language) || 'Unassigned / No Key Man'}
              <span className="ml-2 bg-white/50 px-2 py-0.5 rounded-full text-gray-400 dark:bg-slate-700/50">
                {group.members.length + (group.keyMan ? 1 : 0)} Total
              </span>
            </h3>
          </div>

          {/* MEMBERS TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-white border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:bg-slate-800 dark:border-slate-700">
                  <th className="px-6 py-3 w-1/3">
                    {t('roster_name', language)}
                  </th>
                  <th className="px-6 py-3 w-1/6">
                    {t('roster_role', language)}
                  </th>
                  <th className="px-6 py-3">{t('roster_perms', language)}</th>
                  <th className="px-6 py-3 w-24 text-center">
                    {t('grid_actions', language) || 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                {/* IF KEY MAN EXISTS, SHOW HIM FIRST AS A FULL ROW */}
                {group.keyMan && (
                  <PersonRow p={group.keyMan} {...rowProps} />
                )}

                {group.members.length === 0 && !group.keyMan ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-6 py-8 text-center text-gray-400 italic bg-gray-50/30 dark:bg-slate-800/30"
                    >
                      {t('drop_members_hint', language) ||
                        'Drop members here to assign'}
                    </td>
                  </tr>
                ) : (
                  group.members.map((p) => (
                    <PersonRow key={p.id} p={p} {...rowProps} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
