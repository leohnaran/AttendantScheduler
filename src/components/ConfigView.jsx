import React, { useState, useEffect, useMemo } from 'react'
import { t } from '../i18n/translations'
import RulesView from './RulesView'

export default function ConfigView({
  areas,
  setAreas,
  positions,
  setPositions,
  shifts,
  setShifts,
  personnel,
  rules,
  setRules,
  tags,
  blueprints,
  setBlueprints,
  onConfigUpdate,
  language,
}) {
  const [activeTab, setActiveTab] = useState('areas')

  const handleExportBlueprint = (blueprint) => {
    try {
      const data = JSON.stringify(blueprint, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${blueprint.name.replace(/\s+/g, '_')}.assemblyhall`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  }

  const handleImportBlueprint = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const blueprint = JSON.parse(event.target.result);
        if (!blueprint.areas || !blueprint.positions || !blueprint.shifts) {
          throw new Error("Invalid blueprint format.");
        }
        // Ensure unique ID
        blueprint.id = "bp_" + Date.now();
        setBlueprints([...blueprints, blueprint]);
        alert(`Blueprint "${blueprint.name}" imported successfully!`);
      } catch (err) {
        alert("Import failed: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  const [areaForm, setAreaForm] = useState({
    name: '',
    capability: '',
    style: { backgroundColor: '#ffffff', color: '#000000' },
    limitType: '',
    limitValue: '',
  })
  const [editingAreaId, setEditingAreaId] = useState(null)
  const [editAreaForm, setEditAreaForm] = useState(null)

  const [posForm, setPosForm] = useState({
    name: '',
    areaId: areas.length > 0 ? areas[0].id : '',
    type: 'rotational',
    limitType: '',
    limitValue: '',
    section: '',
  })
  const [editingPosId, setEditingPosId] = useState(null)
  const [editPosForm, setEditPosForm] = useState(null)

  const [shiftForm, setShiftForm] = useState({ label: '', minutes: 120 })

  const uniqueCongregations = useMemo(() => {
    return [
      ...new Set(
        personnel
          .map((p) => p.congregation)
          .filter((c) => c && c.trim() !== ''),
      ),
    ].sort()
  }, [personnel])

  const renderConstraintSelector = (form, setForm, prefix) => (
    <div className="flex gap-2 items-center">
      <select
        value={form.limitType || ''}
        onChange={(e) =>
          setForm({ ...form, limitType: e.target.value, limitValue: '' })
        }
        className="border p-1 rounded text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-white"
      >
        <option value="">No Constraint</option>
        <option value="keyman">Limit to Team</option>
        <option value="congregation">Limit to Cong</option>
        <option value="tag">Limit to Tag</option>
      </select>
      {form.limitType && (
        <select
          value={form.limitValue || ''}
          onChange={(e) => setForm({ ...form, limitValue: e.target.value })}
          className="border p-1 rounded text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-white"
        >
          <option value="">-- Select --</option>
          {form.limitType === 'keyman' &&
            personnel
              .filter((p) => p.caps && p.caps.includes('keyman'))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          {form.limitType === 'congregation' &&
            uniqueCongregations.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          {form.limitType === 'tag' &&
            tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
        </select>
      )}
    </div>
  )

  const getConstraintLabel = (obj) => {
    if (!obj.limitType) return '-'
    if (obj.limitType === 'keyman') {
      const p = personnel.find((x) => x.id === parseInt(obj.limitValue))
      return `Team: ${p ? p.name : obj.limitValue}`
    }
    if (obj.limitType === 'tag') {
      const t = tags.find((x) => x.id === obj.limitValue)
      return `Tag: ${t ? t.name : obj.limitValue}`
    }
    return `${obj.limitType}: ${obj.limitValue}`
  }

  // --- AREA ACTIONS ---
  const addArea = () => {
    if (!areaForm.name || !areaForm.capability) return
    const id = 'area_' + Date.now()
    setAreas([...areas, { id, ...areaForm }])
    setAreaForm({
      name: '',
      capability: '',
      style: { backgroundColor: '#ffffff', color: '#000000' },
      limitType: '',
      limitValue: '',
    })
  }

  const startEditArea = (area) => {
    setEditingAreaId(area.id)
    setEditAreaForm({ ...area })
  }

  const saveAreaEdit = () => {
    const oldArea = areas.find((a) => a.id === editingAreaId)
    const updatedAreas = areas.map((a) =>
      a.id === editingAreaId ? { ...editAreaForm } : a,
    )
    setAreas(updatedAreas)

    // If constraint was cleared, ask to clear sub-positions
    if (oldArea && oldArea.limitType && !editAreaForm.limitType) {
      const affectedPositions = positions.filter(
        (p) => p.areaId === editingAreaId && p.limitType,
      )
      if (
        affectedPositions.length > 0 &&
        confirm(
          `You cleared the constraint for "${oldArea.name}". Would you like to clear the constraints for all positions in this area as well?`,
        )
      ) {
        setPositions(
          positions.map((p) =>
            p.areaId === editingAreaId
              ? { ...p, limitType: '', limitValue: '' }
              : p,
          ),
        )
      }
    }

    setEditingAreaId(null)
    setEditAreaForm(null)
  }

  const deleteArea = (id) => {
    if (confirm('Delete area and all associated positions?')) {
      setAreas(areas.filter((a) => a.id !== id))
      setPositions(positions.filter((p) => p.areaId !== id))
    }
  }

  // --- SHIFT ACTIONS ---
  const addShift = () => {
    if (!shiftForm.label) return
    const id = 'shift_' + Date.now()
    setShifts([...shifts, { id, ...shiftForm }])
    setShiftForm({ label: '', minutes: 120 })
  }

  const deleteShift = (id) => {
    if (confirm('Delete this shift?')) {
      setShifts(shifts.filter((s) => s.id !== id))
    }
  }

  // --- POSITION ACTIONS ---
  useEffect(() => {
    if (areas.length > 0 && !posForm.areaId) {
      setPosForm((prev) => ({
        ...prev,
        areaId: areas[0].id,
      }))
    }
  }, [posForm.areaId, areas])

  const addPosition = () => {
    if (!posForm.name) return
    const id = 'pos_' + Date.now()
    setPositions([...positions, { id, ...posForm }])
    setPosForm({
      ...posForm,
      name: '',
      limitType: '',
      limitValue: '',
      section: '',
    })
  }

  const startEditPos = (pos) => {
    setEditingPosId(pos.id)
    setEditPosForm({ ...pos })
  }

  const savePosEdit = () => {
    setPositions(
      positions.map((p) => (p.id === editingPosId ? { ...editPosForm } : p)),
    )
    setEditingPosId(null)
    setEditPosForm(null)
  }

  const deletePosition = (id) => {
    if (confirm('Delete this position?')) {
      setPositions(positions.filter((p) => p.id !== id))
    }
  }

  // --- BLUEPRINT ACTIONS ---
  const saveBlueprint = () => {
    const name = prompt('Enter a name for this blueprint:')
    if (!name) return
    const newBp = {
      id: 'bp_' + Date.now(),
      name,
      areas,
      positions,
      shifts,
    }
    setBlueprints([...blueprints, newBp])

    // Automatically trigger unprotected download
    try {
      const data = JSON.stringify(newBp, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${name.replace(/\s+/g, '_')}.assemblyhall`
      a.click()
      window.URL.revokeObjectURL(url)
      alert(`Blueprint "${name}" saved and downloaded!`)
    } catch (err) {
      console.error('Auto-download failed', err)
    }
  }

  const loadBlueprint = (bp) => {
    if (
      confirm(
        'Load this template? This will replace your current Areas, Shifts, and Positions. Schedule data might become invalid.',
      )
    ) {
      onConfigUpdate({
        areas: bp.areas,
        positions: bp.positions,
        shifts: bp.shifts,
      })
    }
  }

  const deleteBlueprint = (id) => {
    if (confirm('Delete this blueprint?')) {
      setBlueprints(blueprints.filter((bp) => bp.id !== id))
    }
  }

  return (
    <div className="glass-panel p-8 rounded-3xl shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-6 dark:text-white">
        System Configuration
      </h2>

      <div className="flex border-b border-gray-200 mb-6 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('areas')}
          className={`px-4 py-2 ${
            activeTab === 'areas'
              ? 'border-b-2 border-blue-600 font-bold text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {t('config_areas', language)}
        </button>
        <button
          onClick={() => setActiveTab('shifts')}
          className={`px-4 py-2 ${
            activeTab === 'shifts'
              ? 'border-b-2 border-blue-600 font-bold text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {t('config_shifts', language)}
        </button>
        <button
          onClick={() => setActiveTab('positions')}
          className={`px-4 py-2 ${
            activeTab === 'positions'
              ? 'border-b-2 border-blue-600 font-bold text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {t('config_positions', language)}
        </button>
        <button
          onClick={() => setActiveTab('blueprints')}
          className={`px-4 py-2 ${
            activeTab === 'blueprints'
              ? 'border-b-2 border-blue-600 font-bold text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {t('config_blueprints', language)}
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 ${
            activeTab === 'rules'
              ? 'border-b-2 border-blue-600 font-bold text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {t('config_rules', language)}
        </button>
      </div>

      {activeTab === 'areas' && (
        <div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 dark:bg-slate-800 dark:border-slate-700">
            <h3 className="font-bold mb-2 dark:text-white">
              {t('add_new_area', language) || 'Add New Area'}
            </h3>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                placeholder={t('roster_name', language)}
                value={areaForm.name}
                onChange={(e) =>
                  setAreaForm({ ...areaForm, name: e.target.value })
                }
                className="border p-2 rounded w-64 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
              <input
                placeholder={t('roster_perms', language)}
                value={areaForm.capability}
                onChange={(e) =>
                  setAreaForm({ ...areaForm, capability: e.target.value })
                }
                className="border p-2 rounded w-32 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
              <label className="text-sm dark:text-gray-300">
                {t('bg_color', language) || 'Bg Color'}:
              </label>
              <input
                type="color"
                value={areaForm.style.backgroundColor}
                onChange={(e) =>
                  setAreaForm({
                    ...areaForm,
                    style: { ...areaForm.style, backgroundColor: e.target.value },
                  })
                }
              />
              <label className="text-sm ml-2 dark:text-gray-300">
                {t('text_color', language) || 'Text Color'}:
              </label>
              <input
                type="color"
                value={areaForm.style.color}
                onChange={(e) =>
                  setAreaForm({
                    ...areaForm,
                    style: { ...areaForm.style, color: e.target.value },
                  })
                }
              />
              <button
                onClick={addArea}
                className="ml-auto bg-blue-600 text-white px-4 py-1 rounded"
              >
                {t('btn_add', language)} {t('area', language) || 'Area'}
              </button>
            </div>
            <div className="mt-2 flex items-center">
              <span className="text-xs font-bold text-gray-500 uppercase mr-2 dark:text-gray-400">
                {t('restriction', language) || 'Restriction'}:
              </span>
              {renderConstraintSelector(areaForm, setAreaForm, false)}
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-slate-700 dark:text-gray-300">
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">{t('roster_name', language)}</th>
                <th className="p-2 text-left">{t('roster_perms', language)}</th>
                <th className="p-2 text-left">
                  {t('restriction', language) || 'Restriction'}
                </th>
                <th className="p-2 text-left">
                  {t('preview', language) || 'Preview'}
                </th>
                <th className="p-2 w-24">{t('action', language) || 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {areas.map((a) => {
                const isEditing = editingAreaId === a.id
                return (
                  <tr key={a.id}>
                    <td className="p-2 text-xs text-gray-400">{a.id}</td>
                    <td className="p-2">
                      {isEditing ? (
                        <input
                          value={editAreaForm.name}
                          onChange={(e) =>
                            setEditAreaForm({
                              ...editAreaForm,
                              name: e.target.value,
                            })
                          }
                          className="border p-1 rounded w-full dark:bg-slate-700 dark:text-white"
                        />
                      ) : (
                        a.name
                      )}
                    </td>
                    <td className="p-2">
                      {isEditing ? (
                        <input
                          value={editAreaForm.capability}
                          onChange={(e) =>
                            setEditAreaForm({
                              ...editAreaForm,
                              capability: e.target.value,
                            })
                          }
                          className="border p-1 rounded w-full dark:bg-slate-700 dark:text-white"
                        />
                      ) : (
                        a.capability
                      )}
                    </td>
                    <td className="p-2">
                      {isEditing
                        ? renderConstraintSelector(
                            editAreaForm,
                            setEditAreaForm,
                            true,
                          )
                        : getConstraintLabel(a)}
                    </td>
                    <td className="p-2">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <input
                            type="color"
                            value={editAreaForm.style.backgroundColor}
                            onChange={(e) =>
                              setEditAreaForm({
                                ...editAreaForm,
                                style: {
                                  ...editAreaForm.style,
                                  backgroundColor: e.target.value,
                                },
                              })
                            }
                          />
                          <input
                            type="color"
                            value={editAreaForm.style.color}
                            onChange={(e) =>
                              setEditAreaForm({
                                ...editAreaForm,
                                style: {
                                  ...editAreaForm.style,
                                  color: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      ) : (
                        <span
                          style={a.style}
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                        >
                          ABC
                        </span>
                      )}
                    </td>
                    <td className="p-2 flex gap-2 justify-center">
                      {isEditing ? (
                        <button
                          onClick={saveAreaEdit}
                          className="text-green-600 hover:text-green-800 font-bold"
                        >
                          <i className="fa fa-check"></i>
                        </button>
                      ) : (
                        <button
                          onClick={() => startEditArea(a)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <i className="fa fa-pencil"></i>
                        </button>
                      )}
                      <button
                        onClick={() => deleteArea(a.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <i className="fa fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'shifts' && (
        <div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 dark:bg-slate-800 dark:border-slate-700">
            <h3 className="font-bold mb-2 dark:text-white">Add New Shift</h3>
            <div className="flex gap-2 items-center">
              <input
                placeholder="Shift Label (e.g. Morning)"
                value={shiftForm.label}
                onChange={(e) =>
                  setShiftForm({ ...shiftForm, label: e.target.value })
                }
                className="border p-2 rounded flex-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
              <input
                type="number"
                placeholder="Min"
                value={shiftForm.minutes}
                onChange={(e) =>
                  setShiftForm({
                    ...shiftForm,
                    minutes: parseInt(e.target.value),
                  })
                }
                className="border p-2 rounded w-24 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
              <button
                onClick={addShift}
                className="bg-blue-600 text-white px-4 py-1 rounded"
              >
                {t('btn_add', language)}
              </button>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-slate-700 dark:text-gray-300">
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">{t('label', language) || 'Label'}</th>
                <th className="p-2 text-left">
                  {t('minutes', language) || 'Minutes'}
                </th>
                <th className="p-2">{t('action', language) || 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {shifts.map((s) => (
                <tr key={s.id}>
                  <td className="p-2 text-xs text-gray-400">{s.id}</td>
                  <td className="p-2 font-medium">{s.label}</td>
                  <td className="p-2">{s.minutes}</td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => deleteShift(s.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <i className="fa fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'positions' && (
        <div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 dark:bg-slate-800 dark:border-slate-700">
            <h3 className="font-bold mb-2 dark:text-white">Add New Position</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1 ml-1">
                  Name
                </label>
                <input
                  placeholder="Position Name"
                  value={posForm.name}
                  onChange={(e) =>
                    setPosForm({ ...posForm, name: e.target.value })
                  }
                  className="border p-2 rounded w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1 ml-1">
                  Area
                </label>
                <select
                  value={posForm.areaId}
                  onChange={(e) =>
                    setPosForm({ ...posForm, areaId: e.target.value })
                  }
                  className="border p-2 rounded w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1 ml-1">
                  Type
                </label>
                <select
                  value={posForm.type}
                  onChange={(e) =>
                    setPosForm({ ...posForm, type: e.target.value })
                  }
                  className="border p-2 rounded w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                >
                  <option value="rotational">Rotational (Shifts)</option>
                  <option value="auditorium">All Day (Single Person)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1 ml-1">
                  Section / Key Man
                </label>
                <div className="flex gap-2">
                  <input
                    placeholder="Sect (e.g. A)"
                    value={posForm.section}
                    onChange={(e) =>
                      setPosForm({ ...posForm, section: e.target.value })
                    }
                    className="border p-2 rounded w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  />
                  <label className="flex items-center gap-1 cursor-pointer min-w-max">
                    <input
                      type="checkbox"
                      checked={posForm.keyMan}
                      onChange={(e) =>
                        setPosForm({ ...posForm, keyMan: e.target.checked })
                      }
                    />
                    <span className="text-sm font-bold">
                      {t('key_man_only', language)}
                    </span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-xs font-bold text-gray-500 uppercase mr-2">
                  Restriction:
                </span>
                {renderConstraintSelector(posForm, setPosForm, false)}
              </div>
              <button
                onClick={addPosition}
                className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold"
              >
                Add Position
              </button>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 sticky top-0 dark:bg-slate-700 dark:text-gray-300">
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">{t('roster_name', language)}</th>
                <th className="p-2 text-left">{t('area', language) || 'Area'}</th>
                <th className="p-2 text-left">
                  {t('restriction', language) || 'Restriction'}
                </th>
                <th className="p-2 text-left">
                  {t('sect', language) || 'Sect'}
                </th>
                <th className="p-2 text-left">
                  {t('type', language) || 'Type'}
                </th>
                <th className="p-2 w-24">{t('action', language) || 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {positions.map((p) => {
                const isEditing = editingPosId === p.id
                const displayConstraint = getConstraintLabel(p)

                return (
                  <tr key={p.id}>
                    <td className="p-2 text-xs text-gray-400">{p.id}</td>
                    <td className="p-2">
                      {isEditing ? (
                        <input
                          value={editPosForm.name}
                          onChange={(e) =>
                            setEditPosForm({ ...editPosForm, name: e.target.value })
                          }
                          className="border p-1 rounded w-full dark:bg-slate-700 dark:text-white"
                        />
                      ) : (
                        p.name
                      )}
                    </td>
                    <td className="p-2">
                      {isEditing ? (
                        <select
                          value={editPosForm.areaId}
                          onChange={(e) =>
                            setEditPosForm({
                              ...editPosForm,
                              areaId: e.target.value,
                            })
                          }
                          className="border p-1 rounded w-full dark:bg-slate-700 dark:text-white"
                        >
                          {areas.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        areas.find((a) => a.id === p.areaId)?.name || p.areaId
                      )}
                    </td>
                    <td className="p-2 text-xs">
                      {isEditing
                        ? renderConstraintSelector(editPosForm, setEditPosForm, true)
                        : displayConstraint}
                    </td>
                    <td className="p-2">
                      {isEditing ? (
                        <input
                          value={editPosForm.section}
                          onChange={(e) =>
                            setEditPosForm({
                              ...editPosForm,
                              section: e.target.value,
                            })
                          }
                          className="border p-1 rounded w-8 dark:bg-slate-700 dark:text-white"
                        />
                      ) : (
                        <span className="text-xs">{p.section || '-'}</span>
                      )}
                    </td>
                    <td className="p-2 text-xs">
                      {isEditing ? (
                        <select
                          value={editPosForm.type}
                          onChange={(e) =>
                            setEditPosForm({ ...editPosForm, type: e.target.value })
                          }
                          className="border p-1 rounded dark:bg-slate-700 dark:text-white"
                        >
                          <option value="rotational">Rot</option>
                          <option value="auditorium">All</option>
                        </select>
                      ) : (
                        p.type
                      )}
                    </td>
                    <td className="p-2 flex gap-2 justify-center">
                      {isEditing ? (
                        <button
                          onClick={savePosEdit}
                          className="text-green-600 hover:text-green-800 font-bold"
                        >
                          <i className="fa fa-check"></i>
                        </button>
                      ) : (
                        <button
                          onClick={() => startEditPos(p)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <i className="fa fa-pencil"></i>
                        </button>
                      )}
                      <button
                        onClick={() => deletePosition(p.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <i className="fa fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'blueprints' && (
        <div>
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8 dark:bg-blue-900/20 dark:border-blue-800">
            <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2">
              {t('save_current_layout', language)}
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
              {t('save_layout_desc', language)}
            </p>
            <div className="flex gap-3">
                <button
                onClick={saveBlueprint}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                <i className="fa fa-save"></i>
                {t('btn_save_blueprint', language)}
                </button>
                <label className="bg-white border border-blue-200 text-blue-700 px-6 py-2.5 rounded-xl font-bold cursor-pointer hover:bg-blue-50 transition-all flex items-center gap-2 dark:bg-slate-800 dark:border-slate-700 dark:text-blue-400">
                    <i className="fa fa-file-import"></i>
                    Import .assemblyhall
                    <input type="file" accept=".assemblyhall" onChange={handleImportBlueprint} className="hidden" />
                </label>
            </div>
          </div>

          <h3 className="font-bold mb-4 dark:text-white">Saved Blueprints</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {blueprints.length === 0 ? (
              <p>{t('no_blueprints', language)}</p>
            ) : (
              blueprints.map((bp) => (
                <div
                  key={bp.id}
                  className="bg-white border border-gray-200 p-4 rounded-2xl flex justify-between items-center hover:border-blue-300 transition-all dark:bg-slate-800 dark:border-slate-700"
                >
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-white">
                      {bp.name}
                    </h4>
                    {bp.id !== 'bp_default_assembly' && (
                      <p className="text-[10px] text-gray-400 uppercase font-black">
                        {new Date(
                          parseInt(bp.id.split('_')[1]),
                        ).toLocaleDateString()}
                      </p>
                    )}
                    <div className="flex gap-3 mt-1">
                      <div className="text-[8px] font-bold uppercase text-gray-400">
                        {t('config_areas', language)}: {bp.areas.length}
                      </div>
                      <div className="text-[8px] font-bold uppercase text-gray-400">
                        {t('config_shifts', language)}: {bp.shifts.length}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadBlueprint(bp)}
                      className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                      title="Apply this template"
                    >
                      {t('btn_load_template', language)}
                    </button>
                    <button
                      onClick={() => handleExportBlueprint(bp)}
                      className="bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-100 dark:bg-slate-700 dark:text-gray-300"
                      title="Export as .assemblyhall"
                    >
                      <i className="fa fa-share-nodes"></i>
                    </button>
                    {bp.id !== 'bp_default_assembly' && (
                      <button
                        onClick={() => deleteBlueprint(bp.id)}
                        className="text-red-400 hover:text-red-600 transition-colors px-2"
                      >
                        <i className="fa fa-trash"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <RulesView rules={rules} setRules={setRules} language={language} />
      )}
    </div>
  )
}
