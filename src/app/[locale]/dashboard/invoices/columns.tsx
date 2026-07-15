"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, User, Receipt, Printer, CheckCircle, Trash2 } from "lucide-react"
import Link from "next/link"

export type Invoice = {
  id: string
  title: string
  invoice_number: string | null
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  grand_total: number
  currency: string
  invoice_date: string
  due_date: string | null
  contact_id: string | null
  contacts?: { first_name: string; last_name: string | null } | null
}

interface ColumnsProps {
  locale: string
  onDelete: (id: string) => void
  onMarkPaid: (id: string) => void
}

export const getColumns = ({ locale, onDelete, onMarkPaid }: ColumnsProps): ColumnDef<Invoice>[] => [
  {
    accessorKey: "invoice_number",
    header: "Number",
    cell: ({ row }) => {
      return <span className="font-mono text-xs">{row.getValue("invoice_number") || `-`}</span>
    }
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Title
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <span className="font-medium text-foreground">{row.getValue("title")}</span>
  },
  {
    accessorKey: "contact_id",
    header: "Client",
    cell: ({ row }) => {
      const contact = row.original.contacts
      if (!contact) return <span className="text-muted-foreground">-</span>
      return (
        <span className="flex items-center gap-1.5">
          <User size={13} className="text-muted-foreground" />
          {contact.first_name} {contact.last_name || ''}
        </span>
      )
    }
  },
  {
    accessorKey: "grand_total",
    header: "Amount",
    cell: ({ row }) => {
      const total = row.original.grand_total
      const currency = row.original.currency
      return <div className="font-semibold">{total.toLocaleString()} {currency}</div>
    }
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as Invoice['status']
      const badges: Record<string, string> = {
        draft: 'bg-neutral-100 text-neutral-600 border-neutral-200',
        sent: 'bg-blue-50 text-blue-600 border-blue-200',
        paid: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        overdue: 'bg-red-50 text-red-600 border-red-200',
        cancelled: 'bg-neutral-50 text-neutral-400 border-neutral-200',
      }
      return (
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wide ${badges[status]}`}>
          {status}
        </span>
      )
    }
  },
  {
    accessorKey: "due_date",
    header: "Due Date",
    cell: ({ row }) => {
      const date = row.getValue("due_date") as string | null
      return date ? new Date(date).toLocaleDateString() : "-"
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const invoice = row.original
      return (
        <div className="flex items-center gap-1">
          {invoice.status !== 'paid' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarkPaid(invoice.id)}
              className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
              title="Mark as Paid"
            >
              <CheckCircle size={14} />
            </Button>
          )}
          <Link
            href={`/${locale}/dashboard/invoices/${invoice.id}/print`}
            target="_blank"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-neutral-100 hover:text-neutral-900 h-9 w-9"
            title="Print Invoice"
          >
            <Printer size={14} className="text-muted-foreground" />
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(invoice.id)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )
    }
  }
]
