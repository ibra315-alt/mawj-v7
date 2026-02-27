import React, { useState, useEffect } from 'react'
import { DB } from '../data/db'
import { formatCurrency, formatDate } from '../data/constants'
import { Btn, Card, Modal, Input, Select, Textarea, Spinner, Empty, PageHeader, ConfirmModal, toast } from '../components/ui'
import { IcPlus, IcDelete, IcEdit } from '../components/Icons'

/* ══════════════════════════════════════════════════════════
   PARTNERS PAGE v8.5
   ─────────────────────────────────────────────────────────
   Tracks per-partner capital, opening balances, withdrawals.
   Equity formula (mirrors Accounting page):
     Net Equity = capital_in − capital_out + unreimbursed_expenses − withdrawals
   Note: profit share shown for reference only — recorded in
   Accounting page. Partners page handles capital movement only.
══════════════════════════════════════════════════════════ */

const PARTNERS = ['إبراهيم', 'إحسان']

const CAPITAL_TYPES = [
  { value: 'opening',    label: 'رصيد افتتاحي',  color: '#a78bfa' },
  { value: 'deposit',    label: 'إيداع رأس مال',  color: 'var(--action)' },
  { value: 'withdrawal', label: 'سحب رأس مال',    color: 'var(--danger)' },
]

const WITHDRAWAL_TYPES = [
  { value: 'salary',        label: 'راتب' },
  { value: 'dividend',      label: 'توزيع أرباح' },
  { value: 'personal',      label: 'سحب شخصي' },
  { value: 'reimbursement', label: 'استرداد مصروف' },
]

function typeLabel(type) {
  return [...CAPITAL_TYPES, ...WITHDRAWAL_TYPES].find(t => t.value === type)?.label || type
}
function typeColor(type) {
  if (type === 'deposit' || type === 'opening') return 'var(--action)'
  if (type === 'withdrawal') return 'var(--danger)'
  return '#f59e0b'
}

export default function Partners() {
  const [capital,     setCapital]     = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [expenses,    setExpenses]    = useState([])
  const [loading,     setLoading]     = useState(true)

  const [showForm,   setShowForm]   = useState(false)
  const [formMode,   setFormMode]   = useState('capital')   // 'capital' | 'withdrawal'
  const [editItem,   setEditItem]   = useState(null)
  const [deleteId,   setDeleteId]   = useState(null)
  const [deleteTable,setDeleteTable]= useState(null)
  const [deleting,   setDeleting]   = useState(false)
  const [activeTab,  setActiveTab]  = useState('overview')  // 'overview' | 'history'

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [cap, with_, exp] = await Promise.all([
        DB.list('capital_entries', { orderBy: 'date' }),
        DB.list('withdrawals',     { orderBy: 'date' }),
        DB.list('expenses',        { orderBy: 'date' }),
      ])
      setCapital(cap.reverse())
      setWithdrawals(with_.reverse())
      setExpenses(exp)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await DB.delete(deleteTable, deleteId)
      if (deleteTable === 'capital_entries') setCapital(p => p.filter(c => c.id !== deleteId))
      else setWithdrawals(p => p.filter(w => w.id !== deleteId))
      setDeleteId(null)
      toast('تم الحذف')
    } catch { toast('فشل الحذف', 'error') }
    finally { setDeleting(false) }
  }

  function openForm(mode, item = null) {
    setFormMode(mode)
    setEditItem(item)
    setShowForm(true)
  }

  // ── Per-partner equity ──────────────────────────────────
  function getPartnerStats(name) {
    const myCap   = capital.filter(c => c.partner_name === name)
    const myWith  = withdrawals.filter(w => w.partner_name === name)
    const myExp   = expenses.filter(e =>
      (e.paid_by === 'ibrahim' && name === 'إبراهيم') ||
      (e.paid_by === 'ihsan'   && name === 'إحسان')
    )
    const opening      = myCap.filter(c => c.type === 'opening').reduce((s,c) => s+(c.amount||0), 0)
    const capitalIn    = myCap.filter(c => c.type === 'deposit').reduce((s,c) => s+(c.amount||0), 0)
    const capitalOut   = myCap.filter(c => c.type === 'withdrawal').reduce((s,c) => s+(c.amount||0), 0)
    // FIX: Exclude reimbursement withdrawals — unreimbursed tracking handles it
    const totalWith    = myWith.filter(w => w.type !== 'reimbursement').reduce((s,w) => s+(w.amount||0), 0)
    const expPaid      = myExp.reduce((s,e) => s+(e.amount||0), 0)
    const reimbursed   = myExp.filter(e => e.reimbursed).reduce((s,e) => s+(e.amount||0), 0)
    const unreimbursed = expPaid - reimbursed
    const totalCapital = opening + capitalIn - capitalOut
    const netEquity    = totalCapital - totalWith + unreimbursed
    return { opening, capitalIn, capitalOut, totalWith, totalCapital, unreimbursed, netEquity }
  }

  const hasNoData = capital.length === 0 && withdrawals.length === 0

  // Combined history, sorted newest first
  const allHistory = [
    ...capital.map(c    => ({ ...c, _table:'capital_entries', _sign: c.type === 'withdrawal' ? -1 : 1 })),
    ...withdrawals.map(w => ({ ...w, _table:'withdrawals',     _sign: -1 })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <Spinner size={36}/>
    </div>
  )

  return (
    <div className="page">
      <PageHeader
        title="الشركاء"
        subtitle="رأس المال والمسحوبات وحقوق الملكية"
        actions={
          <div style={{ display:'flex', gap:8 }}>
            <Btn variant="secondary" onClick={() => openForm('withdrawal')}>+ مسحوبات</Btn>
            <Btn onClick={() => openForm('capital')}><IcPlus size={15}/> رأس مال</Btn>
          </div>
        }
      />

      {/* Opening balance prompt */}
      {hasNoData && (
        <div style={{
          marginBottom:20, padding:'16px 20px',
          background:'rgba(167,139,250,0.08)', border:'1.5px dashed rgba(167,139,250,0.4)',
          borderRadius:'var(--r-md)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12,
        }}>
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:'#a78bfa', marginBottom:4 }}>📋 لم يتم تسجيل رأس المال بعد</div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>
              أضف الرصيد الافتتاحي لكل شريك حتى تظهر حقوق الملكية بشكل صحيح في صفحة المحاسبة.
            </div>
          </div>
          <Btn onClick={() => openForm('capital')} style={{ background:'rgba(167,139,250,0.15)', color:'#a78bfa', border:'1px solid rgba(167,139,250,0.3)' }}>
            إضافة رصيد افتتاحي
          </Btn>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--bg-hover)', borderRadius:'var(--r-md)', padding:4 }}>
        {[
          { id:'overview', label:'نظرة عامة' },
          { id:'history',  label:'السجل الكامل' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex:1, padding:'9px 8px', borderRadius:8, border:'none', cursor:'pointer',
            background: activeTab===t.id ? 'linear-gradient(135deg,var(--action),var(--info-light))' : 'transparent',
            color: activeTab===t.id ? '#ffffff' : 'var(--text-muted)',
            fontWeight: activeTab===t.id ? 800 : 500, fontSize:13, fontFamily:'inherit',
            transition:'all 120ms',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <>
          {/* Partner equity cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14, marginBottom:24 }}>
            {PARTNERS.map(name => {
              const s = getPartnerStats(name)
              return (
                <div key={name} style={{
                  background:'var(--bg-surface)', borderRadius:'var(--r-lg)',
                  overflow:'hidden', boxShadow:'var(--card-shadow)',
                }}>
                  {/* Header */}
                  <div style={{
                    padding:'16px', display:'flex', alignItems:'center', justifyContent:'space-between',
                    background: s.netEquity >= 0 ? 'rgba(56,189,248,0.05)' : 'rgba(239,68,68,0.05)',
                    borderBottom:'1px solid var(--border)',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{
                        width:44, height:44, borderRadius:'50%', flexShrink:0,
                        background:'linear-gradient(135deg,var(--info-light),var(--action))',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontWeight:900, fontSize:20, color:'#ffffff',
                      }}>{name[0]}</div>
                      <div>
                        <div style={{ fontWeight:800, fontSize:16 }}>{name}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>50% من الأرباح</div>
                      </div>
                    </div>
                    <div style={{ textAlign:'left' }}>
                      <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:2 }}>صافي الملكية</div>
                      <div style={{ fontSize:22, fontWeight:900, fontFamily:'Inter,sans-serif', color: s.netEquity >= 0 ? 'var(--action)' : 'var(--danger)' }}>
                        {formatCurrency(s.netEquity)}
                      </div>
                    </div>
                  </div>

                  {/* Breakdown rows */}
                  <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:6 }}>
                    {s.opening > 0 && (
                      <Row label="رصيد افتتاحي" value={`+${formatCurrency(s.opening)}`} color="#a78bfa"/>
                    )}
                    {s.capitalIn > 0 && (
                      <Row label="إيداعات" value={`+${formatCurrency(s.capitalIn)}`} color="var(--action)"/>
                    )}
                    {s.capitalOut > 0 && (
                      <Row label="سحب رأس مال" value={`−${formatCurrency(s.capitalOut)}`} color="var(--danger)"/>
                    )}
                    <Row label="رأس المال الصافي" value={formatCurrency(s.totalCapital)} color="var(--text)" bold/>
                    {s.totalWith > 0 && (
                      <Row label="مسحوبات ورواتب" value={`−${formatCurrency(s.totalWith)}`} color="var(--danger)"/>
                    )}
                    {s.unreimbursed > 0 && (
                      <Row label="مصاريف غير مردودة" value={`+${formatCurrency(s.unreimbursed)}`} color="#f59e0b"/>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary totals */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10, marginBottom:24 }}>
            {[
              { label:'إجمالي رأس المال',    value: formatCurrency(capital.reduce((s,c) => s+(c.type==='withdrawal'?-(c.amount||0):(c.amount||0)), 0)), color:'var(--action)' },
              { label:'إجمالي المسحوبات',   value: formatCurrency(withdrawals.reduce((s,w)=>s+(w.amount||0),0)), color:'var(--danger)' },
              { label:'عدد القيود',          value: capital.length + withdrawals.length, color:'var(--text-muted)' },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--bg-surface)', borderRadius:'var(--r-md)', padding:'12px 14px', boxShadow:'var(--card-shadow)' }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:16, fontWeight:800, color:s.color, fontFamily:'Inter,sans-serif' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Capital entries per partner */}
          {PARTNERS.map(name => {
            const myCap  = capital.filter(c => c.partner_name === name)
            const myWith = withdrawals.filter(w => w.partner_name === name)
            if (myCap.length === 0 && myWith.length === 0) return null
            return (
              <div key={name} style={{ marginBottom:20 }}>
                <div style={{ fontWeight:800, fontSize:14, marginBottom:10, color:'var(--text-sec)' }}>{name}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {[...myCap.map(c=>({...c,_table:'capital_entries'})), ...myWith.map(w=>({...w,_table:'withdrawals'}))]
                    .sort((a,b) => new Date(b.date)-new Date(a.date))
                    .map(item => (
                      <EntryRow
                        key={item.id} item={item}
                        onDelete={() => { setDeleteId(item.id); setDeleteTable(item._table) }}
                      />
                    ))
                  }
                </div>
              </div>
            )
          })}

          {hasNoData && (
            <Empty title="لا يوجد قيود بعد" action={
              <Btn onClick={() => openForm('capital')}><IcPlus size={14}/> أضف رصيد افتتاحي</Btn>
            }/>
          )}
        </>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <>
          {allHistory.length === 0
            ? <Empty title="لا يوجد سجلات"/>
            : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {allHistory.map(item => (
                  <EntryRow
                    key={`${item._table}-${item.id}`} item={item}
                    showPartner
                    onDelete={() => { setDeleteId(item.id); setDeleteTable(item._table) }}
                  />
                ))}
              </div>
            )
          }
        </>
      )}

      {/* Forms & Modals */}
      <PartnerForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditItem(null) }}
        mode={formMode}
        editItem={editItem}
        onSaved={item => {
          if (formMode === 'capital') setCapital(p => [item, ...p])
          else setWithdrawals(p => [item, ...p])
          setShowForm(false)
          setEditItem(null)
          toast('تم الحفظ ✓')
        }}
      />
      <ConfirmModal
        open={!!deleteId}
        onClose={() => { setDeleteId(null); setDeleteTable(null) }}
        onConfirm={handleDelete}
        loading={deleting}
        message="سيتم حذف القيد نهائياً."
      />
    </div>
  )
}

/* ── Small helper components ─────────────────────────────── */

function Row({ label, value, color, bold }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ color:'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 600, color: color || 'var(--text)', fontFamily:'Inter,sans-serif' }}>{value}</span>
    </div>
  )
}

function EntryRow({ item, showPartner, onDelete }) {
  const isCapital    = !!item._table && item._table === 'capital_entries'
  const isNegative   = item.type === 'withdrawal' || (!isCapital)
  const label        = typeLabel(item.type)
  const color        = typeColor(item.type)

  return (
    <div style={{
      background:'var(--bg-surface)', borderRadius:'var(--r-md)',
      padding:'11px 14px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
      boxShadow:'var(--card-shadow)',
    }}>
      {/* Type pill */}
      <span style={{
        padding:'3px 10px', borderRadius:999, fontSize:10, fontWeight:800, flexShrink:0,
        background:`${color}18`, color, border:`1px solid ${color}30`,
      }}>{label}</span>

      <div style={{ flex:1, minWidth:0 }}>
        {showPartner && (
          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:2 }}>{item.partner_name}</div>
        )}
        {item.notes && (
          <div style={{ fontSize:12, color:'var(--text-sec)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.notes}</div>
        )}
      </div>

      <span style={{ fontSize:12, color:'var(--text-muted)', flexShrink:0 }}>{formatDate(item.date)}</span>
      <span style={{ fontWeight:800, fontSize:14, flexShrink:0, fontFamily:'Inter,sans-serif', color: isNegative ? 'var(--danger)' : 'var(--action)' }}>
        {isNegative ? '−' : '+'}{formatCurrency(item.amount)}
      </span>
      <Btn variant="danger" size="sm" onClick={onDelete}><IcDelete size={13}/></Btn>
    </div>
  )
}

/* ── Form modal ───────────────────────────────────────────── */

function PartnerForm({ open, onClose, mode, editItem, onSaved }) {
  const [form,   setForm]   = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!open) return
    if (editItem) {
      setForm(editItem)
    } else {
      setForm({
        partner_name: PARTNERS[0],
        date:         new Date().toISOString().split('T')[0],
        type:         mode === 'capital' ? 'deposit' : 'salary',
        amount:       '',
        notes:        '',
      })
    }
  }, [open, mode, editItem])

  async function handleSave() {
    if (!form.amount || parseFloat(form.amount) <= 0) { toast('أدخل مبلغاً صحيحاً', 'error'); return }
    setSaving(true)
    try {
      const table   = mode === 'capital' ? 'capital_entries' : 'withdrawals'
      const payload = {
        partner_name: form.partner_name,
        type:         form.type,
        amount:       parseFloat(form.amount),
        date:         form.date,
        notes:        form.notes || '',
      }
      const saved = editItem
        ? await DB.update(table, editItem.id, payload)
        : await DB.insert(table, payload)
      onSaved(saved)
    } catch (err) { toast('فشل الحفظ: ' + err.message, 'error') }
    finally { setSaving(false) }
  }

  const isCapital = mode === 'capital'
  const typeHint = isCapital
    ? { opening:'يُستخدم لتسجيل المبلغ الذي أودعه الشريك قبل بدء النظام.', deposit:'إضافة رأس مال جديد للشركة.', withdrawal:'سحب جزء من رأس المال.' }
    : {}

  return (
    <Modal
      open={open} onClose={onClose}
      title={isCapital ? (editItem ? 'تعديل قيد رأس مال' : 'قيد رأس مال جديد') : (editItem ? 'تعديل مسحوبات' : 'قيد مسحوبات جديد')}
      width={420}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
        <Btn loading={saving} onClick={handleSave}>حفظ</Btn>
      </>}
    >
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Select label="الشريك" value={form.partner_name||''} onChange={e => set('partner_name', e.target.value)}>
          {PARTNERS.map(p => <option key={p} value={p}>{p}</option>)}
        </Select>

        <Select label="النوع" value={form.type||''} onChange={e => set('type', e.target.value)}>
          {isCapital
            ? CAPITAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)
            : WITHDRAWAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)
          }
        </Select>

        {/* Type hint for capital */}
        {isCapital && typeHint[form.type] && (
          <div style={{ fontSize:11, color:'var(--text-muted)', padding:'8px 12px', background:'var(--bg-hover)', borderRadius:'var(--r-sm)', marginTop:-6 }}>
            {typeHint[form.type]}
          </div>
        )}

        <Input
          label="المبلغ (د.إ)" type="number" min="0"
          value={form.amount||''} onChange={e => set('amount', e.target.value)}
        />
        <Input
          label="التاريخ" type="date"
          value={form.date||''} onChange={e => set('date', e.target.value)}
        />
        <Textarea
          label="ملاحظات (اختياري)"
          value={form.notes||''} onChange={e => set('notes', e.target.value)}
        />
      </div>
    </Modal>
  )
}
