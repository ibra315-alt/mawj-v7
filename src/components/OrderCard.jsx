import React, { useState } from 'react'
import { formatCurrency, timeAgo, SOURCE_LABELS, SOURCE_ICONS } from '../data/constants'
import { Badge, Btn } from './ui'
import { IcWhatsapp, IcEdit, IcEye, IcPhone, IcTrendUp, IcLocation } from './Icons'

export default function OrderCard({ order, statuses, onView, onEdit, onStatusChange, compact }) {
  const [showActions, setShowActions] = useState(false)
  const statusObj = statuses?.find(s => s.id === order.status) || { label: order.status, color: '#6b7280' }

  function sendWhatsApp(type) {
    const phone = order.customer_phone?.replace(/\D/g, '')
    if (!phone) return
    let text = ''
    if (type === 'confirm') {
      text = `مرحباً ${order.customer_name}،\nتم استلام طلبكم رقم ${order.order_number} بنجاح ✅\nالمبلغ الإجمالي: ${formatCurrency(order.total)}\nسيتم التواصل معكم قريباً 🚚`
    } else {
      text = `مرحباً ${order.customer_name}،\nطلبكم رقم ${order.order_number} في الطريق إليكم 🚚✨`
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank')
  }

  const profitColor = order.profit > 0 ? 'var(--green)' : order.profit < 0 ? 'var(--red)' : 'var(--text-muted)'

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--bg-border)',
      borderRadius: 'var(--radius)',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      transition: 'all var(--transition)',
      cursor: 'pointer',
    }}
    onClick={() => onView?.(order)}
    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,228,184,0.3)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bg-border)'; e.currentTarget.style.transform = 'none' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {order.customer_name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{order.order_number}</div>
        </div>
        <Badge color={statusObj.color} style={{ flexShrink: 0 }}>{statusObj.label}</Badge>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: 12, color: 'var(--text-sec)' }}>
        {order.customer_city && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <IcLocation size={12} /> {order.customer_city}
          </span>
        )}
        {order.source && (
          <span>{SOURCE_ICONS[order.source]} {SOURCE_LABELS[order.source]}</span>
        )}
        <span style={{ color: 'var(--text-muted)' }}>{timeAgo(order.created_at)}</span>
      </div>

      {/* Items preview */}
      {order.items?.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-sec)' }}>
          {order.items.slice(0, 2).map((item, i) => (
            <span key={i}>
              {item.name} ×{item.qty}
              {i < Math.min(1, order.items.length - 1) ? '، ' : ''}
            </span>
          ))}
          {order.items.length > 2 && <span style={{ color: 'var(--text-muted)' }}> +{order.items.length - 2}</span>}
        </div>
      )}

      {/* Financial */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--bg-border)' }}>
        <div>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--teal)' }}>{formatCurrency(order.total)}</span>
          {order.discount_amount > 0 && (
            <span style={{ fontSize: 11, color: 'var(--red)', marginRight: 6 }}>خصم {formatCurrency(order.discount_amount)}</span>
          )}
        </div>
        {order.profit !== undefined && (
          <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}>
            <IcTrendUp size={12} color={profitColor} />
            <span style={{ color: profitColor, fontWeight: 600 }}>
              {order.profit > 0 ? '+' : ''}{formatCurrency(order.profit)}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
        onClick={e => e.stopPropagation()}
      >
        {order.customer_phone && (
          <button
            onClick={() => sendWhatsApp('confirm')}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 10px', background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: 7, color: '#25d166', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
          >
            <IcWhatsapp size={14} /> واتساب
          </button>
        )}
        <button
          onClick={() => onEdit?.(order)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 10px', background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 7, color: 'var(--text-sec)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}
        >
          <IcEdit size={14} /> تعديل
        </button>

        {/* Quick status change */}
        {statuses && statuses.length > 0 && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowActions(!showActions)}
              style={{ padding: '7px 12px', background: `${statusObj.color}18`, border: `1px solid ${statusObj.color}40`, borderRadius: 7, color: statusObj.color, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}
            >
              الحالة ▾
            </button>
            {showActions && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: 'var(--bg-card)',
                border: '1px solid var(--bg-border)',
                borderRadius: 'var(--radius-sm)',
                zIndex: 50,
                minWidth: 140,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                overflow: 'hidden',
              }}>
                {statuses.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { onStatusChange?.(order.id, s.id); setShowActions(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '9px 12px',
                      background: order.status === s.id ? `${s.color}15` : 'transparent',
                      border: 'none', color: order.status === s.id ? s.color : 'var(--text)',
                      fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)',
                      textAlign: 'right',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
