'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Search, 
  Calendar, 
  AlertCircle,
  Clock,
  User,
  Trash2,
  Filter
} from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  due_date: string
  assigned_to?: string
}

const DEFAULT_TASKS: Task[] = [
  {
    id: '1',
    title: 'Follow up with lead on apartment viewing',
    description: 'Call Mark to ask if he liked the city center penthouse viewing.',
    status: 'todo',
    priority: 'high',
    due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
  },
  {
    id: '2',
    title: 'Prepare sales contract for Down Town Loft',
    description: 'Send contract draft to legal for review before the client meeting on Friday.',
    status: 'in_progress',
    priority: 'medium',
    due_date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
  },
  {
    id: '3',
    title: 'Upload floor plan for luxury villa',
    description: 'Get high-res PDF and upload to property page gallery.',
    status: 'completed',
    priority: 'low',
    due_date: new Date().toISOString().split('T')[0],
  }
]

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in_progress' | 'completed'>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all')
  
  // Modal State
  const [isOpen, setIsOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newDueDate, setNewDueDate] = useState('')

  // Load from localstorage fallback
  useEffect(() => {
    const saved = localStorage.getItem('estateline_tasks')
    if (saved) {
      try {
        setTasks(JSON.parse(saved))
      } catch {
        setTasks(DEFAULT_TASKS)
      }
    } else {
      setTasks(DEFAULT_TASKS)
      localStorage.setItem('estateline_tasks', JSON.stringify(DEFAULT_TASKS))
    }
  }, [])

  const saveTasks = (updated: Task[]) => {
    setTasks(updated)
    localStorage.setItem('estateline_tasks', JSON.stringify(updated))
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTitle,
      description: newDesc,
      status: 'todo',
      priority: newPriority,
      due_date: newDueDate || new Date().toISOString().split('T')[0],
    }

    const updated = [newTask, ...tasks]
    saveTasks(updated)
    
    // Reset form
    setNewTitle('')
    setNewDesc('')
    setNewPriority('medium')
    setNewDueDate('')
    setIsOpen(false)
  }

  const toggleStatus = (id: string) => {
    const updated = tasks.map(t => {
      if (t.id === id) {
        const nextStatus: Record<string, Task['status']> = {
          todo: 'in_progress',
          in_progress: 'completed',
          completed: 'todo'
        }
        return { ...t, status: nextStatus[t.status] }
      }
      return t
    })
    saveTasks(updated)
  }

  const deleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id)
    saveTasks(updated)
  }

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          t.description.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Organize daily workflows and follow-ups with leads.
          </p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg shadow-soft transition-all"
        >
          <Plus size={18} />
          Add Task
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-card border border-border rounded-xl shadow-soft">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg bg-background text-sm text-foreground">
            <Filter size={14} className="text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent border-none p-0 pr-6 focus:ring-0 text-sm font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg bg-background text-sm text-foreground">
            <AlertCircle size={14} className="text-muted-foreground" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="bg-transparent border-none p-0 pr-6 focus:ring-0 text-sm font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center p-12 bg-card rounded-xl border border-border border-dashed">
            <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm font-medium">No tasks found matching filters.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const priorityColors = {
              high: 'bg-destructive/10 text-destructive border-destructive/20',
              medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
              low: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            }

            return (
              <div 
                key={task.id}
                className={`p-4 bg-card border border-border rounded-xl shadow-soft hover:shadow-md transition-all flex items-start gap-4 ${
                  task.status === 'completed' ? 'opacity-70' : ''
                }`}
              >
                <button 
                  onClick={() => toggleStatus(task.id)}
                  className="mt-1 text-primary hover:scale-110 transition-transform"
                >
                  {task.status === 'completed' && <CheckSquare size={20} className="text-primary fill-primary/10" />}
                  {task.status === 'in_progress' && <Clock size={20} className="text-amber-500" />}
                  {task.status === 'todo' && <Square size={20} className="text-muted-foreground" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className={`font-semibold text-foreground text-base ${
                      task.status === 'completed' ? 'line-through text-muted-foreground' : ''
                    }`}>
                      {task.title}
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${priorityColors[task.priority]}`}>
                      {task.priority}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                      task.status === 'completed' ? 'bg-muted text-muted-foreground border-border' :
                      task.status === 'in_progress' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {task.status === 'todo' ? 'to do' : task.status === 'in_progress' ? 'in progress' : 'completed'}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                    {task.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} />
                      Due: {task.due_date}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => deleteTask(task.id)}
                  className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-muted transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Create Task Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground font-display">Log New Task</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Call back client"
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Details of the task..."
                  rows={3}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg shadow-soft hover:bg-primary/90 transition-colors text-sm"
              >
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
