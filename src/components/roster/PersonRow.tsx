import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Person, Area, Shift, Tag, RosterFormData } from '../../types/models'

interface PersonRowProps {
  p: Person;
  editingId: number | null;
  formData: RosterFormData;
  setFormData: React.Dispatch<React.SetStateAction<RosterFormData>> | ((val: any) => void);
  tags: Tag[];
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
  virtualStyle?: React.CSSProperties;
}

export default function PersonRow({
  p,
  editingId,
  formData,
  setFormData,
  tags,
  areas,
  shifts,
  personnel,
  savePerson,
  cancelEdit,
  setMergingId,
  startEdit,
  deletePerson,
  handleCapChange,
  handleUnavailableChange,
  handleTagAdd,
  handleTagRemove,
  virtualStyle,
}: PersonRowProps) {
  const isEditing = editingId === p.id
  const isKeyMan = p.caps && p.caps.includes('keyman')

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: p.id,
    disabled: isEditing || isKeyMan || false,
  })

  // Merge virtualStyle with dnd-kit transform
  let finalTransform = virtualStyle?.transform || ''
  if (transform) {
    const dndTransform = CSS.Translate.toString(transform)
    finalTransform = finalTransform ? `${finalTransform} ${dndTransform}` : dndTransform
  }

  const style: React.CSSProperties = {
    ...virtualStyle,
    transform: finalTransform || undefined,
    zIndex: isDragging ? 50 : (virtualStyle?.zIndex || 'auto') as any,
    opacity: isDragging ? 0.8 : 1,
    boxShadow: isDragging ? '0 5px 15px rgba(0,0,0,0.1)' : 'none',
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`draggable-row transition-all duration-200 ${isEditing
          ? 'bg-yellow-50/50 dark:bg-yellow-900/20'
          : isKeyMan
            ? 'bg-blue-50/20 dark:bg-blue-900/10 hover:bg-blue-50/40'
            : 'hover:bg-gray-50/80 bg-white dark:bg-slate-800 dark:hover:bg-slate-700/50'
        }`}
    >
      <td className="px-6 py-3 font-medium text-gray-700 dark:text-gray-200">
        {isEditing ? (
          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                (setFormData as any)({
                  ...formData,
                  name: e.target.value,
                })
              }
              className="border p-1 rounded w-full text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              autoFocus
            />
            <input
              type="text"
              list="congregation-list"
              value={formData.congregation}
              onChange={(e) =>
                (setFormData as any)({
                  ...formData,
                  congregation: e.target.value,
                })
              }
              className="border p-1 rounded w-full text-[10px] text-gray-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              placeholder="Congregation"
            />
            {!isKeyMan && (
              <select
                value={formData.keyManId}
                onChange={(e) =>
                  (setFormData as any)({
                    ...formData,
                    keyManId: e.target.value,
                  })
                }
                className="border p-1 rounded w-full text-[10px] text-gray-500 mt-0.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              >
                <option value="">-- No Key Man --</option>
                {personnel
                  .filter((km) => km.caps && km.caps.includes('keyman') && km.id !== p.id)
                  .map((km) => (
                    <option key={km.id} value={km.id}>
                      {km.name}
                    </option>
                  ))}
              </select>
            )}
            <div className="mt-1">
              <select
                onChange={(e) => {
                  handleTagAdd(e.target.value)
                  e.target.value = ''
                }}
                className="border p-1 rounded w-full text-[10px] text-gray-500 mb-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              >
                <option value="">+ Add Tag...</option>
                {tags
                  .filter(
                    (t) =>
                      !formData.tags ||
                      !formData.tags.includes(t.id),
                  )
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
              <div className="flex flex-wrap gap-1">
                {formData.tags &&
                  formData.tags.map((tid) => {
                    const t = tags.find((tag) => tag.id === tid)
                    return t ? (
                      <span
                        key={tid}
                        className="bg-purple-100 text-purple-800 text-[9px] px-1.5 py-0.5 rounded border border-purple-200 flex items-center gap-1 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-800"
                      >
                        {t.name}{' '}
                        <button
                          onClick={() => handleTagRemove(tid)}
                          className="hover:text-red-500"
                        >
                          <i className="fa fa-times"></i>
                        </button>
                      </span>
                    ) : null
                  })}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                {isKeyMan ? (
                  <div className="w-5 h-5 rounded bg-blue-100 text-blue-600 flex items-center justify-center dark:bg-blue-900 dark:text-blue-300">
                    <i className="fa fa-user-tie text-[10px]"></i>
                  </div>
                ) : (
                  <div {...attributes} {...listeners} className="cursor-grab touch-none active:cursor-grabbing px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-slate-600">
                    <i className="fa fa-grip-vertical text-gray-300 dark:text-gray-500"></i>
                  </div>
                )}
                <span className={isKeyMan ? 'font-black text-blue-900 dark:text-blue-300' : ''}>{p.name}</span>
              </div>
              {p.tags &&
                p.tags.map((tid) => {
                  const t = tags
                    ? tags.find((tag) => tag.id === tid)
                    : null
                  return t ? (
                    <span
                      key={tid}
                      className="ml-1 text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded border border-purple-200"
                    >
                      <i className="fa fa-tag mr-1"></i>
                      {t.name}
                    </span>
                  ) : null
                })}
            </div>
            {p.congregation && (
              <div className={`text-[10px] ml-7 dark:text-gray-500 ${isKeyMan ? 'text-blue-500/70 font-bold' : 'text-gray-400'}`}>
                {p.congregation}
              </div>
            )}
          </div>
        )}
      </td>
      <td className="px-6 py-3">
        {isEditing ? (
          <select
            value={formData.role}
            onChange={(e) =>
              (setFormData as any)({ ...formData, role: e.target.value })
            }
            className="border p-1 rounded w-full text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          >
            <option value="Exemplary">Exemplary</option>
            <option value="MS">MS (Ministerial Servant)</option>
            <option value="Elder">Elder</option>
          </select>
        ) : (
          <span
            title={p.role === 'MS' ? 'Ministerial Servant' : p.role}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-sm
                                                    ${p.role ===
                'Elder'
                ? 'bg-yellow-100 text-yellow-700'
                : p.role ===
                  'MS'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
          >
            {p.role}
          </span>
        )}
      </td>
      <td className="px-6 py-3">
        {isEditing ? (
          <div>
            <div className="flex flex-wrap gap-2 max-w-[200px] mb-2">
              {areas.map((area) => (
                <label
                  key={area.capability}
                  title={area.name}
                  className="flex items-center cursor-pointer text-[10px] bg-white border px-1 rounded hover:bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600"
                >
                  <input
                    type="checkbox"
                    checked={!!formData.caps[area.capability!]}
                    onChange={(e) =>
                      handleCapChange(
                        area.capability!,
                        e.target.checked,
                      )
                    }
                    className="mr-1 w-3 h-3"
                  />
                  {area.capability === 'auditorium'
                    ? 'Aud'
                    : area.capability?.slice(0, 3).toUpperCase()}
                </label>
              ))}
              <label
                title="Key Man"
                className="flex items-center cursor-pointer text-[10px] bg-yellow-50 border border-yellow-200 px-1 rounded hover:bg-yellow-100 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-100 dark:hover:bg-yellow-900/50">
                <input
                  type="checkbox"
                  checked={!!formData.caps['keyman']}
                  onChange={(e) =>
                    handleCapChange('keyman', e.target.checked)
                  }
                  className="mr-1 w-3 h-3"
                />
                KM
              </label>
            </div>
            <div className="border-t border-gray-200 pt-1 dark:border-slate-600">
              <span className="text-[9px] font-bold uppercase text-gray-400 block mb-1">
                Unavailable
              </span>
              <div className="flex flex-wrap gap-1 items-center">
                <label
                  title="Absent All Day"
                  className="flex items-center cursor-pointer text-[10px] bg-red-50 border border-red-200 text-red-600 px-1 rounded hover:bg-red-100 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 font-bold mr-1"
                >
                  <input
                    type="checkbox"
                    checked={
                      formData.unavailable &&
                      formData.unavailable.includes('all_day')
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        (setFormData as any)({ ...formData, unavailable: ['all_day', ...shifts.map(s => s.id)] });
                      } else {
                        (setFormData as any)({ ...formData, unavailable: [] });
                      }
                    }}
                    className="mr-1 w-3 h-3 text-red-600"
                  />
                  ALL DAY
                </label>
                <div className="w-px h-4 bg-gray-300 mx-1 dark:bg-slate-600"></div>
                {shifts.map((s) => (
                  <label
                    key={s.id}
                    title={s.label}
                    className="flex items-center cursor-pointer text-[10px] bg-white border px-1 rounded hover:bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600"
                  >
                    <input
                      type="checkbox"
                      checked={
                        formData.unavailable &&
                        formData.unavailable.includes(s.id)
                      }
                      onChange={(e) =>
                        handleUnavailableChange(
                          s.id,
                          e.target.checked,
                        )
                      }
                      className="mr-1 w-3 h-3"
                    />
                    {s.label.split('(')[0]}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {p.caps?.map((c) => {
              const areaObj = areas.find(a => a.capability === c);
              const fullName = areaObj ? areaObj.name : (c === 'keyman' ? 'Key Man' : c.charAt(0).toUpperCase() + c.slice(1));
              const displayName = c === 'auditorium' ? 'Aud' : (c === 'keyman' ? 'KM' : (areaObj ? (areaObj.capability!.length > 4 ? areaObj.capability!.slice(0, 3).toUpperCase() : areaObj.name) : c.charAt(0).toUpperCase() + c.slice(1)));

              return (
                <span
                  key={c}
                  title={fullName}
                  className={`text-[10px] border px-2 py-0.5 rounded-full font-medium ${isKeyMan ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}
                >
                  {displayName}
                </span>
              );
            })}
            {p.unavailable && p.unavailable.length > 0 && (
              <span
                className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full font-bold ml-1"
                title={`Unavailable: ${p.unavailable.map(id => shifts.find(s => s.id === id)?.label).join(', ')}`}
              >
                Unavail ({p.unavailable.length})
              </span>
            )}
          </div>
        )}
      </td>
      <td className="px-6 py-3 text-center">
        {isEditing ? (
          <div className="flex justify-center gap-2">
            <button
              onClick={savePerson}
              className="text-green-600 hover:text-green-800 font-bold text-xs bg-green-50 px-2 py-1 rounded border border-green-200"
            >
              Save
            </button>
            <button
              onClick={cancelEdit}
              className="text-gray-500 hover:text-gray-700 text-xs px-2 py-1"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setMergingId(p.id)}
              className="text-gray-400 hover:text-purple-600 transition-colors"
              title="Merge this record into another"
            >
              <i className="fa fa-code-merge"></i>
            </button>
            <button
              onClick={() => startEdit(p)}
              className="text-gray-400 hover:text-blue-600 transition-colors"
            >
              <i className="fa fa-pencil"></i>
            </button>
            <button
              onClick={() => deletePerson(p.id)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <i className="fa fa-trash"></i>
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
