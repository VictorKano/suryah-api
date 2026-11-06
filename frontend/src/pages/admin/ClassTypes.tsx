import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createClassType,
  deleteClassType,
  listClassTypes,
  updateClassType,
} from '../../api/classTypes'
import { getErrorMessage } from '../../api/client'
import { FullPageSpinner, Spinner } from '../../components/Spinner'
import { ErrorBanner } from '../../components/ErrorBanner'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import type { ClassTypeResponse } from '../../types'

interface FormState {
  name: string
  description: string
}

const emptyForm: FormState = { name: '', description: '' }

export function ClassTypesAdmin() {
  const { toast } = useToast()
  const [classTypes, setClassTypes] = useState<ClassTypeResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ClassTypeResponse | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setClassTypes(await listClassTypes())
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (ct: ClassTypeResponse) => {
    setEditing(ct)
    setForm({ name: ct.name, description: ct.description ?? '' })
    setFormError(null)
    setModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      if (editing) {
        await updateClassType(editing.id, {
          name: form.name,
          description: form.description || undefined,
        })
      } else {
        await createClassType({
          name: form.name,
          description: form.description || undefined,
        })
      }
      setModalOpen(false)
      await load()
      toast(editing ? 'Tipo de aula atualizado.' : 'Tipo de aula criado.')
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteClassType(id)
      setDeleteId(null)
      await load()
      toast('Tipo de aula removido.', 'info')
    } catch (err) {
      // Keep modal open and show the specific error (e.g. FK constraint)
      setDeleteError(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <FullPageSpinner />

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sage-800">Tipos de Aula</h1>
        <button
          onClick={openCreate}
          className="rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sage-700"
        >
          + Novo Tipo
        </button>
      </div>

      <ErrorBanner message={error} />

      {classTypes.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-sage-200 py-16 text-center text-sage-400">
          Nenhum tipo de aula cadastrado.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-sage-100 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="border-b border-sage-100 bg-sage-50 text-sm text-sage-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage-50">
              {classTypes.map((ct) => (
                <tr key={ct.id} className="text-sm text-sage-700">
                  <td className="px-4 py-3 font-medium">{ct.name}</td>
                  <td className="px-4 py-3 text-sage-500">
                    {ct.description || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(ct)}
                        className="rounded-lg border border-sage-200 px-3 py-1 text-xs text-sage-600 hover:bg-sage-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          setDeleteId(ct.id)
                          setDeleteError(null)
                        }}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar tipo de aula' : 'Novo tipo de aula'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">
              Nome
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">
              Descrição
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
            />
          </div>
          <ErrorBanner message={formError} />
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg px-4 py-2 text-sm text-sage-600 hover:bg-sage-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700 disabled:opacity-60"
            >
              {saving && <Spinner />}
              Salvar
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={deleteId !== null}
        onClose={() => {
          setDeleteId(null)
          setDeleteError(null)
        }}
        title="Excluir tipo de aula"
      >
        <p className="mb-2 text-sage-600">
          Esta ação é <strong>permanente</strong> e não pode ser desfeita.
        </p>
        <p className="mb-4 text-sm text-amber-600">
          Só é possível excluir se não houver aulas recorrentes ou sessões
          vinculadas. Se houver, remova-os primeiro.
        </p>
        <ErrorBanner message={deleteError} />
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={() => {
              setDeleteId(null)
              setDeleteError(null)
            }}
            className="rounded-lg px-4 py-2 text-sm text-sage-600 hover:bg-sage-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => deleteId && handleDelete(deleteId)}
            disabled={deleting}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
          >
            {deleting && <Spinner />}
            Excluir permanentemente
          </button>
        </div>
      </Modal>
    </div>
  )
}
