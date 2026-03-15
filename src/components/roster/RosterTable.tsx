import React, { useRef } from 'react'
import { t } from '../../i18n/translations'
import PersonRow from './PersonRow'
import { useDroppable } from '@dnd-kit/core'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Person, Area, Shift, RosterFormData } from '../../types/models'

interface PersonRowBaseProps {
  editingId: number | null;
  formData: RosterFormData;
  setFormData: React.Dispatch<React.SetStateAction<RosterFormData>> | ((val: any) => void);
  tags: any[];
  areas: Area[];
  shifts: Shift[];
  personnel: Person[];
  savePerson: () => Promise<void> | void;
  cancelEdit: () => void;
  setMergingId: (id: number | null) => void;
  startEdit: (p: Person) => void;
  deletePerson: (id: number) => Promise<void> | void;
  handleCapChange: (cap: string, checked: boolean) => void;
  handleUnavailableChange: (shiftId: string, checked: boolean) => void;
  handleTagAdd: (tagId: string) => void;
  handleTagRemove: (tagId: string) => void;
}

interface Group {
  keyMan: Person | null;
  members: Person[];
}

interface DroppableGroupProps {
  group: Group;
  language: string;
  rowProps: PersonRowBaseProps;
}

function DroppableGroup({ group, language, rowProps }: DroppableGroupProps) {
  const groupId = group.keyMan ? group.keyMan.id.toString() : 'unassigned'
  const { setNodeRef, isOver } = useDroppable({
    id: groupId,
  })

  // Virtualization for large lists inside a group
  const parentRef = useRef<HTMLDivElement>(null)
  
  const rowVirtualizer = useVirtualizer({
    count: group.members.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // approx height of a row
    overscan: 5,
  })

  return (
    <div
      ref={setNodeRef}
      className={`droppable-group border border-gray-100 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${isOver
          ? 'bg-blue-50/50 ring-2 ring-blue-200 ring-offset-2'
          : 'bg-white'
        }`}
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
      <div 
        ref={parentRef}
        className="overflow-x-auto overflow-y-auto max-h-[400px]"
      >
        <table className="w-full text-sm text-left block">
          <thead className="sticky top-0 z-10 bg-white dark:bg-slate-800 shadow-sm border-b border-gray-100 dark:border-slate-700 block w-full">
            <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex w-full">
              <th className="px-6 py-3 w-[30%]">
                {t('roster_name', language)}
              </th>
              <th className="px-6 py-3 w-[15%]">
                {t('roster_role', language)}
              </th>
              <th className="px-6 py-3 flex-1">{t('roster_perms', language)}</th>
              <th className="px-6 py-3 w-32 text-center">
                {t('grid_actions', language) || 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody 
            className="divide-y divide-gray-50 dark:divide-slate-700/50 block w-full"
            style={{
              height: group.members.length > 0 ? `${rowVirtualizer.getTotalSize()}px` : 'auto',
              position: 'relative'
            }}
          >
            {/* IF KEY MAN EXISTS, SHOW HIM FIRST */}
            {group.keyMan && (
              <PersonRow p={group.keyMan} {...rowProps} />
            )}

            {group.members.length === 0 && !group.keyMan ? (
              <tr className="flex w-full">
                <td
                  className="px-6 py-8 text-center text-gray-400 italic bg-gray-50/30 dark:bg-slate-800/30 w-full"
                >
                  {t('drop_members_hint', language) ||
                    'Drop members here to assign'}
                </td>
              </tr>
            ) : (
              rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const p = group.members[virtualRow.index];
                return (
                  <PersonRow 
                    key={p.id} 
                    p={p} 
                    {...rowProps}
                    virtualStyle={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`
                    }}
                  />
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface RosterTableProps {
  groups: Group[];
  language: string;
  rowProps: PersonRowBaseProps;
}

export default function RosterTable({
  groups,
  language,
  rowProps,
}: RosterTableProps) {
  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <DroppableGroup key={group.keyMan ? group.keyMan.id : 'unassigned'} group={group} language={language} rowProps={rowProps} />
      ))}
    </div>
  )
}
