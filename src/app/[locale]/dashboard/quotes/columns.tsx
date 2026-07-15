"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, User, Building2, Trash2 } from "lucide-react"

export type Quote = {
  id: string
  category: string | null
  amount: number | null
  unit_price: number | null
  created_at: string
  contact_id: string | null
  lead_id: string | null
  property_id: string | null
  contacts?: { first_name: string; last_name: string | null } | null
  leads?: { first_name: string; last_name: string | null } | null
  properties?: { title: string; price: number; currency: string } | null
}

interface ColumnsProps {
  onDelete: (id: string) => void
}

export const getColumns = ({ onDelete }: ColumnsProps): ColumnDef<Quote>[] => [
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      return new Date(row.getValue("created_at")).toLocaleDateString()
    }
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const amount = row.getValue("amount") as number | null
      const currency = row.original.properties?.currency || "BAM"
      if (amount === null) return "-"
      return <div className="font-semibold">{amount.toLocaleString()} {currency}</div>
    }
  },
  {
    accessorKey: "property_id",
    header: "Property",
    cell: ({ row }) => {
      const property = row.original.properties
      if (!property) return <span className="text-muted-foreground">-</span>
      return (
        <span className="flex items-center gap-1.5 max-w-xs truncate">
          <Building2 size={13} className="text-muted-foreground" />
          {property.title}
        </span>
      )
    }
  },
  {
    accessorKey: "contact_id",
    header: "Client",
    cell: ({ row }) => {
      const contact = row.original.contacts
      const lead = row.original.leads
      if (!contact && !lead) return <span className="text-muted-foreground">-</span>
      return (
        <span className="flex items-center gap-1.5">
          <User size={13} className="text-muted-foreground" />
          {contact ? `${contact.first_name} ${contact.last_name || ''}` : `${lead?.first_name} ${lead?.last_name || ''} (Lead)`}
        </span>
      )
    }
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => row.getValue("category") || "-"
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const quote = row.original
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(quote.id)}
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 size={14} />
        </Button>
      )
    }
  }
]
