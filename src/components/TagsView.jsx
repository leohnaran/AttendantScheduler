import React, { useState } from 'react'
import { t } from '../i18n/translations'

export default function TagsView({
  tags,
  setTags,
  personnel,
  setPersonnel,
  shifts,
  areas,
  onDeleteTag,
  language,
}) {
  const [newTag, setNewTag] = useState({
    name: '',
    restrictedShifts: [],
    restrictedAreas: [],
  })
  const [selectedTagId, setSelectedTagId] = useState('')
  const [filterName, setFilterName] = useState('')

  // --- TAG MANAGEMENT ---
  const addTag = () => {
    if (!newTag.name) return alert('Tag Name is required')
    const id = 'tag_' + Date.now()
    setTags([...tags, { id, ...newTag }])
    setNewTag({ name: '', restrictedShifts: [], restrictedAreas: [] })
    setSelectedTagId(id) // Auto-select new tag
  }

  const deleteTag = (tagId) => {
    console.log('TagsView: deleteTag called for:', tagId)
    if (confirm('Delete this tag?')) {
      onDeleteTag(tagId)
      if (selectedTagId === tagId) {
        console.log('TagsView: Deselecting deleted tag')
        setSelectedTagId('')
      }
    }
  }

  // Toggle for NEW tag form
  const toggleShiftNew = (shiftId) => {
    const current = newTag.restrictedShifts
    if (current.includes(shiftId)) {
      setNewTag({
        ...newTag,
        restrictedShifts: current.filter((s) => s !== shiftId),
      })
    } else {
      setNewTag({ ...newTag, restrictedShifts: [...current, shiftId] })
    }
  }

  const toggleAreaNew = (areaId) => {
    const current = newTag.restrictedAreas || []
    if (current.includes(areaId)) {
      setNewTag({
        ...newTag,
        restrictedAreas: current.filter((a) => a !== areaId),
      })
    } else {
      setNewTag({ ...newTag, restrictedAreas: [...current, areaId] })
    }
  }

  // Toggle for EXISTING tag (Edit Mode)
  const toggleShiftEdit = (tag, shiftId) => {
    const current = tag.restrictedShifts || []
    let newShifts
    if (current.includes(shiftId)) {
      newShifts = current.filter((s) => s !== shiftId)
    } else {
      newShifts = [...current, shiftId]
    }
    const updatedTag = { ...tag, restrictedShifts: newShifts }
    setTags(tags.map((t) => (t.id === tag.id ? updatedTag : t)))
  }

  const toggleAreaEdit = (tag, areaId) => {
    const current = tag.restrictedAreas || []
    let newAreas
    if (current.includes(areaId)) {
      newAreas = current.filter((a) => a !== areaId)
    } else {
      newAreas = [...current, areaId]
    }
    const updatedTag = { ...tag, restrictedAreas: newAreas }
    setTags(tags.map((t) => (t.id === tag.id ? updatedTag : t)))
  }

  const updateTagName = (tag, newName) => {
    setTags(tags.map((t) => (t.id === tag.id ? { ...t, name: newName } : t)))
  }

  // --- BULK ASSIGNMENT ---
  const togglePersonTag = (personId, tagId) => {
    const person = personnel.find((p) => p.id === personId)
    if (!person) return

    const currentTags = person.tags || []
    let newTags
    if (currentTags.includes(tagId)) {
      newTags = currentTags.filter((t) => t !== tagId)
    } else {
      newTags = [...currentTags, tagId]
    }

    setPersonnel(
      personnel.map((p) => (p.id === personId ? { ...p, tags: newTags } : p)),
    )
  }

  const selectedTag = tags.find((t) => t.id === selectedTagId)

  // FILTER & SORT (Ensuring personnel is an array)
  const safePersonnel = Array.isArray(personnel) ? personnel : []
  const filteredPersonnel = safePersonnel.filter(
    (p) =>
      p.name.toLowerCase().includes(filterName.toLowerCase()) ||
      (p.role && p.role.toLowerCase().includes(filterName.toLowerCase())) ||
      (p.congregation &&
        p.congregation.toLowerCase().includes(filterName.toLowerCase())),
  )
  filteredPersonnel.sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="glass-panel p-8 rounded-3xl shadow-sm">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight dark:text-white">
          Tags & Constraints
        </h2>
        <div className="text-[10px] bg-gray-100 px-3 py-1 rounded-full text-gray-500 font-bold dark:bg-slate-800 dark:text-gray-400 border border-gray-200 dark:border-slate-700">
          SYSTEM STATUS: {safePersonnel.length} BROTHERS DETECTED
        </div>
      </div>

      {/* TOP: CREATE TAG */}
      <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 mb-8 dark:bg-slate-800/50 dark:border-slate-700">
        <h3 className="font-bold text-lg mb-2 dark:text-gray-200">
          Create New Tag
        </h3>
        <div className="flex flex-col md:flex-row gap-4 items-start mb-2">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1 ml-1 dark:text-gray-500">
              Tag Name
            </label>
            <input
              type="text"
              value={newTag.name}
              onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
              className="border border-gray-200 p-2.5 rounded-xl w-full bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              placeholder="e.g. Bus Riders"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1 ml-1 dark:text-gray-500">
              Restricted Shifts (Cannot Work)
            </label>
            <div className="flex flex-wrap gap-2 mb-4">
              <label
                className={`flex items-center text-sm px-3 py-1.5 rounded-full cursor-pointer transition-all border ${
                  newTag.restrictedShifts.includes('all_day')
                    ? 'bg-blue-100 border-blue-200 text-blue-700 font-bold dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={newTag.restrictedShifts.includes('all_day')}
                  onChange={() => toggleShiftNew('all_day')}
                  className="mr-2"
                />
                All Day (Auditorium)
              </label>
              {shifts.map((s) => (
                <label
                  key={s.id}
                  className={`flex items-center text-sm px-3 py-1.5 rounded-full cursor-pointer transition-all border ${
                    newTag.restrictedShifts.includes(s.id)
                      ? 'bg-red-100 border-red-200 text-red-700 font-bold dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={newTag.restrictedShifts.includes(s.id)}
                    onChange={() => toggleShiftNew(s.id)}
                    className="mr-2"
                  />
                  {s.label}
                </label>
              ))}
            </div>

            <label className="block text-xs font-bold uppercase text-gray-400 mb-1 ml-1 dark:text-gray-500">
              Restricted Areas (Cannot Work)
            </label>
            <div className="flex flex-wrap gap-2">
              {areas.map((a) => (
                <label
                  key={a.id}
                  className={`flex items-center text-sm px-3 py-1.5 rounded-full cursor-pointer transition-all border ${
                    newTag.restrictedAreas && newTag.restrictedAreas.includes(a.id)
                      ? 'bg-purple-100 border-purple-200 text-purple-700 font-bold dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={
                      newTag.restrictedAreas &&
                      newTag.restrictedAreas.includes(a.id)
                    }
                    onChange={() => toggleAreaNew(a.id)}
                    className="mr-2"
                  />
                  {a.name}
                </label>
              ))}
            </div>
          </div>
          <button
            onClick={addTag}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold hover:bg-blue-700 md:mt-5 w-full md:w-auto shadow-sm active:scale-95 transition-all dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Create
          </button>
        </div>
      </div>

      {/* MAIN SPLIT: LIST & ASSIGN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LEFT: TAG LIST */}
        <div className="border rounded-2xl p-4 bg-white/50 dark:bg-slate-800/30 dark:border-slate-700">
          <h3 className="font-bold text-lg mb-4 border-b border-gray-100 pb-2 dark:text-gray-200 dark:border-slate-700">
            Existing Tags
          </h3>
          {tags.length === 0 && (
            <p className="text-gray-400 italic">No tags created.</p>
          )}
          <ul className="space-y-2">
            {tags.map((tag) => (
              <li
                key={tag.id}
                onClick={() => setSelectedTagId(tag.id)}
                className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${
                  selectedTagId === tag.id
                    ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-200 dark:bg-slate-700 dark:border-blue-500 dark:ring-blue-900'
                    : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold text-gray-800 dark:text-gray-200">
                    {tag.name}
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400">
                    {tag.restrictedShifts.length > 0 && (
                      <span>{tag.restrictedShifts.length} shifts</span>
                    )}
                    {tag.restrictedShifts.length > 0 &&
                      tag.restrictedAreas &&
                      tag.restrictedAreas.length > 0 && <span>, </span>}
                    {tag.restrictedAreas && tag.restrictedAreas.length > 0 && (
                      <span>{tag.restrictedAreas.length} areas</span>
                    )}
                    {!tag.restrictedShifts.length &&
                      (!tag.restrictedAreas || !tag.restrictedAreas.length) && (
                        <span>No restrictions</span>
                      )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteTag(tag.id)
                  }}
                  className="text-gray-400 hover:text-red-500 px-2 transition-colors dark:text-gray-500 dark:hover:text-red-400"
                >
                  <i className="fa fa-trash"></i>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT: ASSIGNMENT */}
        <div className="col-span-2 border rounded-2xl p-6 flex flex-col h-[650px] bg-white/50 dark:bg-slate-800/30 dark:border-slate-700">
          {selectedTag ? (
            <>
              <div className="mb-6 pb-6 border-b border-gray-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg dark:text-gray-200">
                    Edit Tag:{' '}
                    <span className="text-blue-600 dark:text-blue-400">
                      {selectedTag.name}
                    </span>
                  </h3>
                </div>

                {/* EDIT CONTROLS */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1 dark:text-gray-500">
                      Tag Name
                    </label>
                    <input
                      type="text"
                      value={selectedTag.name}
                      onChange={(e) => updateTagName(selectedTag, e.target.value)}
                      className="border border-gray-200 p-2 rounded-lg w-full max-w-sm text-sm focus:ring-2 focus:ring-blue-100 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-2 dark:text-gray-500">
                      Restricted Shifts
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <label
                        className={`flex items-center text-xs px-2.5 py-1 rounded-full cursor-pointer transition-all border ${
                          selectedTag.restrictedShifts.includes('all_day')
                            ? 'bg-blue-100 border-blue-200 text-blue-700 font-bold dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTag.restrictedShifts.includes('all_day')}
                          onChange={() => toggleShiftEdit(selectedTag, 'all_day')}
                          className="mr-1.5"
                        />
                        All Day
                      </label>
                      {shifts.map((s) => (
                        <label
                          key={s.id}
                          className={`flex items-center text-xs px-2.5 py-1 rounded-full cursor-pointer transition-all border ${
                            selectedTag.restrictedShifts.includes(s.id)
                              ? 'bg-red-100 border-red-200 text-red-700 font-bold dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedTag.restrictedShifts.includes(s.id)}
                            onChange={() => toggleShiftEdit(selectedTag, s.id)}
                            className="mr-1.5"
                          />
                          {s.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-2 dark:text-gray-500">
                      Restricted Areas
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {areas.map((a) => (
                        <label
                          key={a.id}
                          className={`flex items-center text-xs px-2.5 py-1 rounded-full cursor-pointer transition-all border ${
                            selectedTag.restrictedAreas &&
                            selectedTag.restrictedAreas.includes(a.id)
                              ? 'bg-purple-100 border-purple-200 text-purple-700 font-bold dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={
                              selectedTag.restrictedAreas &&
                              selectedTag.restrictedAreas.includes(a.id)
                            }
                            onChange={() => toggleAreaEdit(selectedTag, a.id)}
                            className="mr-1.5"
                          />
                          {a.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">
                  Manage Members
                </h4>
                <div className="relative w-64">
                  <i className="fa fa-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                  <input
                    type="text"
                    placeholder="Search Name or Role..."
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="w-full border border-gray-200 p-2 pl-9 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl bg-gray-50/50 shadow-inner dark:bg-slate-800/50 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0 dark:bg-slate-700 dark:text-gray-300">
                    <tr>
                      <th className="p-3 text-left w-10"></th>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Role</th>
                      <th className="p-3 text-left">Current Tags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {filteredPersonnel.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-10 text-center text-gray-400 italic bg-white/50 dark:bg-slate-800/30">
                          {safePersonnel.length === 0 
                            ? "No brothers found in roster. Please add people in the Roster tab first."
                            : "No brothers match your search filter."
                          }
                        </td>
                      </tr>
                    ) : (
                      filteredPersonnel.map((p) => {
                        const isMember =
                          p.tags && p.tags.includes(selectedTag.id)
                        return (
                          <tr
                            key={p.id}
                            className={`hover:bg-white transition-colors cursor-pointer group dark:hover:bg-slate-700 ${
                              isMember ? 'bg-green-50 dark:bg-green-900/10' : ''
                            }`}
                            onClick={() => togglePersonTag(p.id, selectedTag.id)}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isMember || false}
                                onChange={() => {}} // Handled by row click
                                className="w-4 h-4 cursor-pointer text-blue-600 rounded focus:ring-blue-500 dark:bg-slate-600 dark:border-slate-500"
                              />
                            </td>
                            <td className="p-3 font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 transition-colors">
                              {p.name}
                            </td>
                            <td className="p-3 text-xs text-gray-500 dark:text-gray-400">
                              <span title={p.role === 'MS' ? 'Ministerial Servant' : p.role}>{p.role}</span>
                            </td>
                            <td className="p-3 text-xs text-gray-500">
                              {p.tags &&
                                p.tags.map((tid) => {
                                  const t = tags.find((tag) => tag.id === tid)
                                  return t ? (
                                    <span
                                      key={tid}
                                      className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded mr-1 dark:bg-slate-600 dark:text-gray-300"
                                    >
                                      {t.name}
                                    </span>
                                  ) : null
                                })}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-xs text-gray-400 text-right dark:text-gray-500">
                Click rows to toggle membership.
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-2xl mb-4 dark:bg-slate-700">
                <i className="fa fa-tags"></i>
              </div>
              <p>
                Select a tag from the left to edit settings and manage members.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
