import React, { useState, useMemo } from 'react'
import { t } from '../i18n/translations'
import { getLastName, parseCSV, getAssignId } from '../utils/helpers'
import CSVMapperModal from './CSVMapperModal'

export default function RosterView({
  personnel,
  setPersonnel,
  assignments,
  setAssignments,
  areas,
  shifts,
  tags,
  onMerge,
  language,
}) {
  const initialCaps = useMemo(() => {
    const c = { keyman: false }
    areas.forEach((a) => (c[a.capability] = true))
    return c
  }, [areas])

  const [formData, setFormData] = useState({
    name: '',
    congregation: '',
    role: 'Exemplary',
    caps: initialCaps,
    keyManId: '',
    unavailable: [],
    tags: [],
  })
  const [editingId, setEditingId] = useState(null)
  const [mergingId, setMergingId] = useState(null)
  const [draggedPersonId, setDraggedPersonId] = useState(null)
  const [dragOverGroup, setDragOverGroup] = useState(null)
  const [csvData, setCsvData] = useState(null)

  const uniqueCongregations = useMemo(() => {
    return [
      ...new Set(
        personnel
          .map((p) => p.congregation)
          .filter((c) => c && c.trim() !== ''),
      ),
    ].sort()
  }, [personnel])

  // --- FORM HANDLERS ---
  const handleCapChange = (cap, checked) => {
    setFormData((prev) => ({ ...prev, caps: { ...prev.caps, [cap]: checked } }))
  }

  const handleUnavailableChange = (shiftId, checked) => {
    setFormData((prev) => {
      const newUnavailable = checked
        ? [...(prev.unavailable || []), shiftId]
        : (prev.unavailable || []).filter((id) => id !== shiftId)
      return { ...prev, unavailable: newUnavailable }
    })
  }

  const handleTagAdd = (tagId) => {
    if (!tagId) return
    setFormData((prev) => {
      const current = prev.tags || []
      if (current.includes(tagId)) return prev
      return { ...prev, tags: [...current, tagId] }
    })
  }

  const handleTagRemove = (tagId) => {
    setFormData((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((t) => t !== tagId),
    }))
  }

  const startEdit = (person) => {
    setEditingId(person.id)
    const newCaps = { keyman: false }
    areas.forEach((a) => (newCaps[a.capability] = false))

    person.caps.forEach((c) => {
      newCaps[c] = true
    })
    setFormData({
      name: person.name,
      congregation: person.congregation || '',
      role: person.role || 'Exemplary',
      caps: newCaps,
      keyManId: person.keyManId ? person.keyManId.toString() : '',
      unavailable: person.unavailable || [],
      tags: person.tags || [],
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData({
      name: '',
      congregation: '',
      role: 'Exemplary',
      caps: initialCaps,
      keyManId: '',
      unavailable: [],
      tags: [],
    })
  }

  const handleMergeAction = (targetId) => {
    if (!mergingId || !targetId) return
    const source = personnel.find((p) => p.id === mergingId)
    const target = personnel.find((p) => p.id === targetId)
    if (confirm(`Are you sure you want to merge ${source.name} into ${target.name}? \n\nAll of ${source.name}'s assignments will be moved to ${target.name}. This cannot be undone.`)) {
      onMerge(mergingId, targetId)
      setMergingId(null)
    }
  }

  const savePerson = () => {
    if (!formData.name.trim()) return
    const capabilityList = Object.keys(formData.caps).filter(
      (k) => formData.caps[k],
    )
    const newKeyManId = formData.keyManId ? parseInt(formData.keyManId) : null

    const newPerson = {
      name: formData.name,
      congregation: formData.congregation,
      role: formData.role,
      caps: capabilityList,
      keyManId: newKeyManId,
      unavailable: formData.unavailable,
      tags: formData.tags,
    }

    if (editingId !== null) {
      setPersonnel(
        personnel.map((p) =>
          p.id === editingId ? { ...p, ...newPerson } : p,
        ),
      )

      // Handle unassignments based on unavailability
      let affectedCount = 0;
      const newAssignments = { ...assignments };

      Object.keys(newAssignments).forEach(key => {
        if (getAssignId(newAssignments[key]) === editingId) {
          const isRotational = key.includes('_');
          let assignedShiftId = 'all';
          if (isRotational) {
            const parts = key.split('_');
            assignedShiftId = parts[parts.length - 1];
          }

          if (newPerson.unavailable.includes('all_day') ||
            newPerson.unavailable.includes(assignedShiftId) ||
            (assignedShiftId === 'all' && newPerson.unavailable.length > 0)) {
            newAssignments[key] = null;
            affectedCount++;
          }
        }
      });

      if (affectedCount > 0) {
        if (confirm(`${newPerson.name} is currently assigned to ${affectedCount} position(s) that conflict with this unavailability. Do you want to unassign them from those slots?`)) {
          setAssignments(newAssignments);
        }
      }

      cancelEdit()
    } else {
      const maxId = personnel.reduce((max, p) => (p.id > max ? p.id : max), 0)
      setPersonnel([...personnel, { id: maxId + 1, ...newPerson }])
      setFormData({
        name: '',
        congregation: '',
        role: 'Exemplary',
        caps: initialCaps,
        keyManId: '',
        unavailable: [],
        tags: [],
      })
    }
  }

  const handleCSVUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const rows = parseCSV(event.target.result)
        if (rows.length < 2) return alert('CSV file seems empty or invalid.')
        setCsvData(rows)
      } catch (err) {
        alert('Error parsing CSV: ' + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = '' // Reset input
  }

  const handleImportFinish = (mapping) => {
    if (!csvData) return
    const rows = csvData
    const dataRows = rows
      .slice(1)
      .filter(
        (r) =>
          r.length > 0 && r[mapping.nameIdx] && r[mapping.nameIdx].trim() !== '',
      )

    let newPersonnel = [...personnel]
    let maxId = newPersonnel.reduce((max, p) => (p.id > max ? p.id : max), 0)

    let updatedCount = 0
    let newCount = 0

    dataRows.forEach((row) => {
      const name = row[mapping.nameIdx].trim()
      const rawRole =
        mapping.roleIdx !== -1 ? row[mapping.roleIdx] || '' : ''
      const keyManName =
        mapping.keyManIdx !== -1 ? row[mapping.keyManIdx] || '' : ''
      const congregation =
        mapping.congregationIdx !== -1 ? row[mapping.congregationIdx] || '' : ''

      let role = 'Exemplary'
      if (rawRole.includes('Elder')) role = 'Elder'
      else if (rawRole.includes('Ministerial')) role = 'MS'

      // Default caps (Now assuming everyone can do every area)
      let caps = [
        'lobby',
        'dining',
        'stairs',
        'exterior',
        'backstage',
        'auditorium',
        'upper_level',
      ]

      // Check if they are a Key Man (either self-referencing or referenced by someone else)
      const isReferencedAsKeyMan = dataRows.some(
        (r) =>
          mapping.keyManIdx !== -1 &&
          r[mapping.keyManIdx] &&
          r[mapping.keyManIdx].trim().toLowerCase() === name.toLowerCase(),
      )
      if (
        keyManName.trim().toLowerCase() === name.toLowerCase() ||
        isReferencedAsKeyMan
      ) {
        caps.push('keyman')
      }

      const existingIndex = newPersonnel.findIndex(
        (p) => p.name.toLowerCase() === name.toLowerCase(),
      )

      if (existingIndex >= 0) {
        const existing = newPersonnel[existingIndex]
        newPersonnel[existingIndex] = {
          ...existing,
          role: role,
          congregation: congregation || existing.congregation,
          caps: [...new Set([...existing.caps, ...caps])],
          tempKeyManName: keyManName,
        }
        updatedCount++
      } else {
        maxId++
        newPersonnel.push({
          id: maxId,
          name: name,
          role: role,
          congregation: congregation,
          caps: caps,
          tempKeyManName: keyManName,
        })
        newCount++
      }
    })

    // Link Key Men & Auto-Create Missing Ones
    const tempPersonnel = [...newPersonnel]
    const keyMenToCreate = new Set()

    // 1. Identify missing key men
    tempPersonnel.forEach((p) => {
      if (p.tempKeyManName) {
        const kmName = p.tempKeyManName.trim()
        if (kmName.toLowerCase() !== p.name.toLowerCase()) {
          const exists = tempPersonnel.find(
            (c) => c.name.toLowerCase() === kmName.toLowerCase(),
          )
          if (!exists) keyMenToCreate.add(kmName)
        }
      }
    })

    // 2. Create missing key men (as Elders)
    keyMenToCreate.forEach((kmName) => {
      maxId++
      tempPersonnel.push({
        id: maxId,
        name: kmName,
        role: 'Elder',
        congregation: '',
        caps: ['lobby', 'dining', 'stairs', 'exterior', 'backstage', 'auditorium', 'upper_level', 'keyman'],
        tags: [],
        unavailable: [],
      })
      newCount++
    })

    // 3. Final Link pass
    newPersonnel = tempPersonnel.map((p) => {
      if (
        p.tempKeyManName &&
        p.tempKeyManName.toLowerCase() !== p.name.toLowerCase()
      ) {
        const km = tempPersonnel.find(
          (c) => c.name.toLowerCase() === p.tempKeyManName.toLowerCase(),
        )
        if (km) return { ...p, keyManId: km.id }
      }
      return p
    })

    setPersonnel(newPersonnel)
    setCsvData(null)
    alert(`Import Complete!\nAdded: ${newCount}\nUpdated: ${updatedCount}`)
  }

  const deletePerson = (id) => {
    if (confirm('Delete this person?')) {
      setPersonnel(personnel.filter((p) => p.id !== id))
      if (editingId === id) cancelEdit()
    }
  }

  // --- DRAG AND DROP LOGIC ---
  const handleDragStart = (e, personId) => {
    setDraggedPersonId(personId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, groupId) => {
    e.preventDefault()
    setDragOverGroup(groupId)
  }

  const handleDrop = (e, targetKeyManId) => {
    e.preventDefault()
    setDragOverGroup(null)
    if (draggedPersonId === null) return
    if (draggedPersonId === targetKeyManId) return

    setPersonnel((prev) =>
      prev.map((p) => {
        if (p.id === draggedPersonId) {
          return { ...p, keyManId: targetKeyManId }
        }
        return p
      }),
    )
    setDraggedPersonId(null)
  }

  const renderCheckbox = (key, label) => (
    <label key={key} className="flex items-center cursor-pointer mr-4 mb-2">
      <input
        type="checkbox"
        checked={formData.caps[key]}
        onChange={(e) => handleCapChange(key, e.target.checked)}
        className="mr-2"
      />
      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
        {label}
      </span>
    </label>
  )

  const renderPersonRow = (p) => {
    const isEditing = editingId === p.id
    const isKeyMan = p.caps && p.caps.includes('keyman')

    return (
      <tr
        key={p.id}
        draggable={!isEditing}
        onDragStart={(e) => !isEditing && handleDragStart(e, p.id)}
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
                  setFormData({
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
                  setFormData({
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
                    setFormData({
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
                    <i className="fa fa-grip-vertical text-gray-300 cursor-grab"></i>
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
                setFormData({ ...formData, role: e.target.value })
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
                      checked={formData.caps[area.capability]}
                      onChange={(e) =>
                        handleCapChange(
                          area.capability,
                          e.target.checked,
                        )
                      }
                      className="mr-1 w-3 h-3"
                    />
                    {area.capability === 'auditorium'
                      ? 'Aud'
                      : area.capability.slice(0, 3).toUpperCase()}
                  </label>
                ))}
                <label
                  title="Key Man"
                  className="flex items-center cursor-pointer text-[10px] bg-yellow-50 border border-yellow-200 px-1 rounded hover:bg-yellow-100 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-100 dark:hover:bg-yellow-900/50">
                  <input
                    type="checkbox"
                    checked={formData.caps['keyman']}
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
                          setFormData({ ...formData, unavailable: ['all_day', ...shifts.map(s => s.id)] });
                        } else {
                          setFormData({ ...formData, unavailable: [] });
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
              {p.caps.map((c) => {
                const areaObj = areas.find(a => a.capability === c);
                const fullName = areaObj ? areaObj.name : (c === 'keyman' ? 'Key Man' : c.charAt(0).toUpperCase() + c.slice(1));
                const displayName = c === 'auditorium' ? 'Aud' : (c === 'keyman' ? 'KM' : (areaObj ? (areaObj.capability.length > 4 ? areaObj.capability.slice(0, 3).toUpperCase() : areaObj.name) : c.charAt(0).toUpperCase() + c.slice(1)));

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

  // --- GROUPING & SORTING LOGIC ---
  const keyMen = personnel.filter((p) => p.caps && p.caps.includes('keyman'))
  keyMen.sort((a, b) => getLastName(a.name).localeCompare(getLastName(b.name)))

  const groups = keyMen.map((km) => {
    const members = personnel.filter((p) => p.keyManId === km.id)
    members.sort((a, b) =>
      getLastName(a.name).localeCompare(getLastName(b.name)),
    )
    return { keyMan: km, members: members }
  })

  const orphans = personnel.filter(
    (p) => !p.keyManId && (!p.caps || !p.caps.includes('keyman')),
  )
  orphans.sort((a, b) => getLastName(a.name).localeCompare(getLastName(b.name)))

  if (orphans.length > 0) {
    groups.push({ keyMan: null, members: orphans })
  }

  if (personnel.length === 0) {
    return (
      <>
        <div className="glass-panel p-8 rounded-3xl shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight dark:text-white">
                {t('roster_title', language)}
              </h2>
              <p className="text-gray-500 text-sm mt-1 dark:text-gray-400">
                {t('roster_start_desc', language) || 'Start by adding your team'}
              </p>
            </div>
            <div className="relative overflow-hidden inline-block group">
              <button className="bg-purple-500 text-white py-2 px-5 rounded-full font-semibold shadow-sm hover:bg-purple-600 hover:shadow-md transition-all active:scale-95 flex items-center gap-2 dark:bg-purple-600 dark:hover:bg-purple-700">
                <i className="fa fa-file-csv"></i> {t('roster_import', language)}
              </button>
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* EDIT FORM */}
          <div
            className={`p-6 rounded-2xl border mb-8 bg-gray-50/50 border-gray-200 dark:bg-slate-800/50 dark:border-slate-700`}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                {t('roster_add_person', language)}
              </h3>
            </div>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="mb-2">
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1 dark:text-gray-400">
                  {t('roster_name', language)}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="border border-gray-300 p-2.5 rounded-xl w-48 bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:ring-blue-800"
                  placeholder="Full Name"
                />
              </div>
              <div className="mb-2">
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1 dark:text-gray-400">
                  {t('roster_cong', language)}
                </label>
                <input
                  type="text"
                  list="congregation-list"
                  value={formData.congregation}
                  onChange={(e) =>
                    setFormData({ ...formData, congregation: e.target.value })
                  }
                  className="border border-gray-300 p-2.5 rounded-xl w-32 bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:ring-blue-800"
                  placeholder="Congregation"
                />
                <datalist id="congregation-list">
                  {uniqueCongregations.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="mb-2">
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1 dark:text-gray-400">
                  {t('roster_role', language)}
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="border border-gray-300 p-2.5 rounded-xl w-32 bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm cursor-pointer dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:ring-blue-800"
                >
                  <option value="Exemplary">{t('role_exemplary', language)}</option>
                  <option value="MS">{t('role_ms', language)}</option>
                  <option value="Elder">{t('role_elder', language)}</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1 dark:text-gray-400">
                  {t('roster_keyman', language)}
                </label>
                <select
                  value={formData.keyManId}
                  onChange={(e) =>
                    setFormData({ ...formData, keyManId: e.target.value })
                  }
                  className="border border-gray-300 p-2.5 rounded-xl w-48 bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm cursor-pointer dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:ring-blue-800"
                  disabled
                >
                  <option value="">-- None --</option>
                </select>
              </div>

              <div className="w-full">
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1 dark:text-gray-400">
                  {t('roster_perms', language)}
                </label>
                <div className="flex flex-wrap bg-white p-4 rounded-xl border border-gray-200 mb-4 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                  {areas.map((area) => renderCheckbox(area.capability, area.name))}
                  {renderCheckbox(
                    'keyman',
                    t('roster_keyman', language).toUpperCase(),
                  )}
                </div>
              </div>
              <div className="w-full mb-4">
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1 dark:text-gray-400">
                  {t('roster_unavail', language)}
                </label>
                <div className="flex flex-wrap bg-white p-4 rounded-xl border border-gray-200 shadow-sm dark:bg-slate-800 dark:border-slate-700 items-center">
                  <label className="flex items-center cursor-pointer mr-6 select-none border-r border-gray-200 dark:border-slate-700 pr-6">
                    <input
                      type="checkbox"
                      checked={formData.unavailable && formData.unavailable.includes('all_day')}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        if (isChecked) {
                          setFormData({ ...formData, unavailable: ['all_day', ...shifts.map(s => s.id)] });
                        } else {
                          setFormData({ ...formData, unavailable: [] });
                        }
                      }}
                      className="mr-2 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-200 dark:border-slate-600 dark:bg-slate-700"
                    />
                    <span className="text-sm font-black uppercase text-red-600 dark:text-red-400">
                      Absent All Day
                    </span>
                  </label>
                  {shifts.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center cursor-pointer mr-6 select-none"
                    >
                      <input
                        type="checkbox"
                        checked={
                          formData.unavailable &&
                          formData.unavailable.includes(s.id)
                        }
                        onChange={(e) =>
                          handleUnavailableChange(s.id, e.target.checked)
                        }
                        className="mr-2 w-4 h-4 text-red-500 rounded border-gray-300 focus:ring-red-200 dark:border-slate-600 dark:bg-slate-700"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {s.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={savePerson}
                className={`px-6 py-2.5 rounded-full font-bold shadow-md transition-all active:scale-95 text-white bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none`}
              >
                {t('roster_add_person', language)}
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50 dark:bg-slate-800/50 dark:border-slate-700">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-2xl mb-4 shadow-sm dark:bg-slate-700 dark:text-blue-400">
              <i className="fa fa-user-plus"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 dark:text-white">
              {t('roster_empty', language)}
            </h3>
            <p className="text-gray-500 max-w-sm mb-6 dark:text-gray-400">
              {t('roster_empty_desc', language) ||
                'Add brothers manually using the form above, or import your existing list to get started quickly.'}
            </p>
            <div className="relative overflow-hidden inline-block group">
              <button className="bg-white border border-gray-200 text-gray-700 py-2.5 px-6 rounded-full font-semibold shadow-sm hover:bg-gray-50 transition-all active:scale-95 flex items-center gap-2 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700">
                <i className="fa fa-file-csv text-green-600 dark:text-green-400"></i>{' '}
                {t('roster_import', language)}
              </button>
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
        {csvData && (
          <CSVMapperModal
            data={csvData}
            onImport={handleImportFinish}
            onClose={() => setCsvData(null)}
            language={language}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className="glass-panel p-8 rounded-3xl shadow-sm">
        {/* HEADER & IMPORT */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight dark:text-white">
              {t('roster_title', language)}
            </h2>
            <p className="text-gray-500 text-sm mt-1 dark:text-gray-400">
              {personnel.length}{' '}
              {t('brothers_available', language) || 'brothers available'}
            </p>
          </div>
          <div className="relative overflow-hidden inline-block group">
            <button className="bg-purple-500 text-white py-2 px-5 rounded-full font-semibold shadow-sm hover:bg-purple-600 hover:shadow-md transition-all active:scale-95 flex items-center gap-2">
              <i className="fa fa-file-csv"></i> {t('roster_import', language)}
            </button>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* EDIT FORM */}
        <div
          className={`p-6 rounded-2xl border mb-8 transition-colors ${editingId
            ? 'bg-yellow-50/50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700'
            : 'bg-gray-50/50 border-gray-200 dark:bg-slate-800/50 dark:border-slate-700'
            }`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
              {editingId ? 'Editing Personnel' : t('roster_add_person', language)}
            </h3>
            {editingId && (
              <button
                onClick={cancelEdit}
                className="text-xs text-red-500 hover:text-red-700 font-medium dark:text-red-400 dark:hover:text-red-300"
              >
                {t('btn_cancel', language)}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="mb-2">
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1 dark:text-gray-400">
                {t('roster_name', language)}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="border border-gray-300 p-2.5 rounded-xl w-48 bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:ring-blue-800"
                placeholder="Full Name"
              />
            </div>
            <div className="mb-2">
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1 dark:text-gray-400">
                {t('roster_cong', language)}
              </label>
              <input
                type="text"
                list="congregation-list"
                value={formData.congregation}
                onChange={(e) =>
                  setFormData({ ...formData, congregation: e.target.value })
                }
                className="border border-gray-300 p-2.5 rounded-xl w-32 bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:ring-blue-800"
                placeholder="Congregation"
              />
              <datalist id="congregation-list">
                {uniqueCongregations.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="mb-2">
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1 dark:text-gray-400">
                {t('roster_role', language)}
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="border border-gray-300 p-2.5 rounded-xl w-32 bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm cursor-pointer dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:ring-blue-800"
              >
                <option value="Exemplary">{t('role_exemplary', language)}</option>
                <option value="MS">{t('role_ms', language)}</option>
                <option value="Elder">{t('role_elder', language)}</option>
              </select>
            </div>
            <div className="mb-2">
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1 dark:text-gray-400">
                {t('roster_keyman', language)}
              </label>
              <select
                value={formData.keyManId}
                onChange={(e) =>
                  setFormData({ ...formData, keyManId: e.target.value })
                }
                className="border border-gray-300 p-2.5 rounded-xl w-48 bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm cursor-pointer dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:ring-blue-800"
              >
                <option value="">-- None --</option>
                {personnel
                  .filter(
                    (p) =>
                      p.caps && p.caps.includes('keyman') && p.id !== editingId,
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="w-full">
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1 dark:text-gray-400">
                {t('roster_perms', language)}
              </label>
              <div className="flex flex-wrap bg-white p-4 rounded-xl border border-gray-200 mb-4 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                {areas.map((area) => renderCheckbox(area.capability, area.name))}
                {renderCheckbox(
                  'keyman',
                  t('roster_keyman', language).toUpperCase(),
                )}
              </div>
            </div>
            <div className="w-full mb-4">
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1 dark:text-gray-400">
                {t('roster_unavail', language)}
              </label>
              <div className="flex flex-wrap bg-white p-4 rounded-xl border border-gray-200 shadow-sm dark:bg-slate-800 dark:border-slate-700 items-center">
                <label className="flex items-center cursor-pointer mr-6 select-none border-r border-gray-200 dark:border-slate-700 pr-6">
                  <input
                    type="checkbox"
                    checked={formData.unavailable && formData.unavailable.includes('all_day')}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      if (isChecked) {
                        setFormData({ ...formData, unavailable: ['all_day', ...shifts.map(s => s.id)] });
                      } else {
                        setFormData({ ...formData, unavailable: [] });
                      }
                    }}
                    className="mr-2 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-200 dark:border-slate-600 dark:bg-slate-700"
                  />
                  <span className="text-sm font-black uppercase text-red-600 dark:text-red-400">
                    Absent All Day
                  </span>
                </label>
                {shifts.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center cursor-pointer mr-6 select-none"
                  >
                    <input
                      type="checkbox"
                      checked={
                        formData.unavailable && formData.unavailable.includes(s.id)
                      }
                      onChange={(e) =>
                        handleUnavailableChange(s.id, e.target.checked)
                      }
                      className="mr-2 w-4 h-4 text-red-500 rounded border-gray-300 focus:ring-red-200 dark:border-slate-600 dark:bg-slate-700"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {s.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={savePerson}
              className={`px-6 py-2.5 rounded-full font-bold shadow-md transition-all active:scale-95 text-white ${editingId
                ? 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-200 dark:shadow-none'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none'
                }`}
            >
              {editingId ? 'Update Person' : t('roster_add_person', language)}
            </button>
          </div>
        </div>

        {/* ROSTER LIST (Key Man Groups) */}
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
                    {group.keyMan && renderPersonRow(group.keyMan)}

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
                      group.members.map((p) => renderPersonRow(p))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODALS */}
      {csvData && (
        <CSVMapperModal
          data={csvData}
          onImport={handleImportFinish}
          onClose={() => setCsvData(null)}
          language={language}
        />
      )}

      {/* MERGE MODAL */}
      {mergingId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-200 dark:border-slate-800">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Merge Records</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select who to merge <b>{personnel.find(p => p.id === mergingId)?.name}</b> into.
                </p>
              </div>
              <button onClick={() => setMergingId(null)} className="text-gray-400 hover:text-gray-600">
                <i className="fa fa-times"></i>
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                {personnel
                  .filter(p => p.id !== mergingId)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleMergeAction(p.id)}
                      className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-blue-900/20 transition-all flex justify-between items-center group"
                    >
                      <span className="font-bold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">{p.name}</span>
                      <i className="fa fa-chevron-right text-[10px] text-gray-300 group-hover:text-blue-400"></i>
                    </button>
                  ))
                }
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex justify-center">
              <button onClick={() => setMergingId(null)} className="text-sm font-bold text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
