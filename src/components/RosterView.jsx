import React, { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { t } from '../i18n/translations'
import { getLastName, parseCSV, getAssignId } from '../utils/helpers'
import CSVMapperModal from './CSVMapperModal'
import { useConfirm } from '../hooks/useConfirm'
import MergeModal from './roster/MergeModal'
import RosterForm from './roster/RosterForm'
import EmptyRoster from './roster/EmptyRoster'
import RosterTable from './roster/RosterTable'
import { useStore } from '../store/useStore'
import { DndContext, closestCenter } from '@dnd-kit/core'

export default function RosterView({ onMerge, language }) {
  const confirm = useConfirm()
  const personnel = useStore((state) => state.personnel)
  const assignments = useStore((state) => state.assignments)
  const areas = useStore((state) => state.areas)
  const shifts = useStore((state) => state.shifts)
  const tags = useStore((state) => state.tags)
  const updateState = useStore((state) => state.updateState)

  const setPersonnel = (val) => updateState({ personnel: typeof val === 'function' ? val(personnel) : val })
  const setAssignments = (val) => updateState({ assignments: typeof val === 'function' ? val(assignments) : val })
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

  const handleMergeAction = async (targetId) => {
    if (!mergingId || !targetId) return
    const source = personnel.find((p) => p.id === mergingId)
    const target = personnel.find((p) => p.id === targetId)
    if (await confirm(`Are you sure you want to merge ${source.name} into ${target.name}? \n\nAll of ${source.name}'s assignments will be moved to ${target.name}. This cannot be undone.`)) {
      onMerge(mergingId, targetId)
      setMergingId(null)
    }
  }

  const savePerson = async () => {
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
        if (await confirm(`${newPerson.name} is currently assigned to ${affectedCount} position(s) that conflict with this unavailability. Do you want to unassign them from those slots?`)) {
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
        if (rows.length < 2) return toast.error('CSV file seems empty or invalid.')
        setCsvData(rows)
      } catch (err) {
        toast.error('Error parsing CSV: ' + err.message)
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
    toast.success(`Import Complete!\nAdded: ${newCount}\nUpdated: ${updatedCount}`)
  }

  const deletePerson = async (id) => {
    if (await confirm('Delete this person?')) {
      setPersonnel(personnel.filter((p) => p.id !== id))
      if (editingId === id) cancelEdit()
    }
  }

  // --- DRAG AND DROP LOGIC (dnd-kit) ---
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const personId = active.id;
    const targetKeyManId = over.id === 'unassigned' ? null : over.id;

    if (personId === targetKeyManId) return;

    const person = personnel.find(p => p.id === personId);
    if (!person || person.keyManId === targetKeyManId) return;

    setPersonnel(personnel.map(p => 
      p.id === personId ? { ...p, keyManId: targetKeyManId } : p
    ));
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

  const rowProps = {
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
  }

  if (personnel.length === 0) {
    return (
      <>
        <EmptyRoster
          formData={formData}
          setFormData={setFormData}
          uniqueCongregations={uniqueCongregations}
          areas={areas}
          shifts={shifts}
          personnel={personnel}
          savePerson={savePerson}
          cancelEdit={cancelEdit}
          handleCSVUpload={handleCSVUpload}
          language={language}
        />
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
        <RosterForm
          formData={formData}
          setFormData={setFormData}
          uniqueCongregations={uniqueCongregations}
          areas={areas}
          shifts={shifts}
          personnel={personnel}
          editingId={editingId}
          savePerson={savePerson}
          cancelEdit={cancelEdit}
          language={language}
        />

        {/* ROSTER LIST (Key Man Groups) */}
        <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
          <RosterTable
            groups={groups}
            language={language}
            rowProps={rowProps}
          />
        </DndContext>
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
      <MergeModal
        mergingId={mergingId}
        setMergingId={setMergingId}
        personnel={personnel}
        handleMergeAction={handleMergeAction}
      />
    </>
  )
}
