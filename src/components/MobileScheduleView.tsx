import React from 'react'
import AssignmentCell from './AssignmentCell'
import { Person, Assignment, Area, Position, Shift, Tag } from '../types/models'

interface MobileScheduleViewProps {
  personnel: Person[];
  assignments: Record<string, Assignment | null>;
  onAssign: (key: string, personId: string) => void;
  onFindReplacement: (pos: Position, shiftId: string) => void;
  getConflict: (personId: number | null, pos: Position, shiftId: string, assignments: Record<string, Assignment | null>) => { type: string, msg: string } | null;
  areas: Area[];
  positions: Position[];
  shifts: Shift[];
  tags: Tag[];
  hoveredMirrorKey: string | null;
  setHoveredMirrorKey: (key: string | null) => void;
  language: string;
}

export default function MobileScheduleView({
  personnel,
  assignments,
  onAssign,
  onFindReplacement,
  getConflict,
  areas,
  positions,
  shifts,
  tags,
  hoveredMirrorKey,
  setHoveredMirrorKey,
  language,
}: MobileScheduleViewProps) {
  return (
    <div className="space-y-6">
      {areas.map((area) => (
        <div
          key={area.id}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden"
        >
          <div
            style={area.style}
            className="p-3 font-black uppercase text-xs tracking-widest text-center shadow-sm"
          >
            {area.name}
          </div>
          <div className="divide-y divide-gray-50 dark:divide-slate-700">
            {positions
              .filter((p) => p.areaId === area.id)
              .map((pos) => (
                <div key={pos.id} className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-bold text-gray-800 dark:text-white text-sm">
                      {pos.name}
                    </span>
                    {pos.type === 'auditorium' && (
                      <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-black uppercase dark:bg-blue-900 dark:text-blue-300">
                        All Day
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {pos.type === 'auditorium' ? (
                      <div className="border border-blue-100 dark:border-blue-900 rounded-xl overflow-hidden">
                        <table className="w-full">
                          <tbody>
                            <tr>
                              <AssignmentCell
                                shiftId="all"
                                pos={pos}
                                assignments={assignments}
                                personnel={personnel}
                                onAssign={onAssign}
                                onFindReplacement={onFindReplacement}
                                getConflict={getConflict}
                                areas={areas}
                                tags={tags}
                                hoveredMirrorKey={hoveredMirrorKey}
                                setHoveredMirrorKey={setHoveredMirrorKey}
                                language={language}
                              />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      shifts.map((shift) => {
                        if (pos.validShifts && !pos.validShifts.includes(shift.id))
                          return null
                        return (
                          <div key={shift.id} className="flex flex-col gap-1">
                            <div className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                              {shift.label}
                            </div>
                            <div className="border border-gray-100 dark:border-slate-700 rounded-xl overflow-hidden">
                              <table className="w-full">
                                <tbody>
                                  <tr>
                                    <AssignmentCell
                                      shiftId={shift.id}
                                      pos={pos}
                                      assignments={assignments}
                                      personnel={personnel}
                                      onAssign={onAssign}
                                      onFindReplacement={onFindReplacement}
                                      getConflict={getConflict}
                                      areas={areas}
                                      tags={tags}
                                      hoveredMirrorKey={hoveredMirrorKey}
                                      setHoveredMirrorKey={setHoveredMirrorKey}
                                      language={language}
                                    />
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
