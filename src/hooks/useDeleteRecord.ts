import { useState } from 'react'
import { DB } from '../data/db'
import { toast } from '../components/ui'

/**
 * Reusable delete-with-confirm hook.
 * Replaces the 5 identical delete patterns across pages.
 *
 * @param {string}   table       Supabase table name
 * @param {Function} setItems    State setter for the items list
 * @returns {{ deleteId, setDeleteId, deleting, handleDelete }}
 */
export default function useDeleteRecord(table, setItems) {
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await DB.delete(table, deleteId)
      setItems(prev => prev.filter(i => i.id !== deleteId))
      setDeleteId(null)
      toast('تم الحذف')
    } catch {
      toast('فشل الحذف', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return { deleteId, setDeleteId, deleting, handleDelete }
}
