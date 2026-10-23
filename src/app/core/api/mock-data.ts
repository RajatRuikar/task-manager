import { Task } from '../models/task.model';
import { todayIso } from '../utils/task.utils';

function offsetDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return todayIso(date);
}

/** Seed data, with due dates relative to today so there is always a mix of overdue/upcoming tasks. */
export function createSeedTasks(): Task[] {
  return [
    {
      id: 't-1001',
      title: 'Prepare customs documentation',
      description: 'Collect invoices, packing lists and bill of lading for shipment BSC-2291.',
      status: 'in-progress',
      priority: 'high',
      dueDate: offsetDate(2),
    },
    {
      id: 't-1002',
      title: 'File import general manifest',
      description: 'Submit IGM to the port authority before vessel arrival.',
      status: 'todo',
      priority: 'high',
      dueDate: offsetDate(-1),
    },
    {
      id: 't-1003',
      title: 'Schedule container pickup',
      status: 'todo',
      priority: 'medium',
      dueDate: offsetDate(5),
    },
    {
      id: 't-1004',
      title: 'Reconcile freight invoices',
      description: 'Match carrier invoices against booked rates for last month.',
      status: 'completed',
      priority: 'low',
      dueDate: offsetDate(-4),
    },
    {
      id: 't-1005',
      title: 'Update HS code mapping',
      description: 'Review tariff changes and update product classification table.',
      status: 'in-progress',
      priority: 'medium',
      dueDate: offsetDate(-3),
    },
    {
      id: 't-1006',
      title: 'Client onboarding call',
      status: 'todo',
      priority: 'low',
      dueDate: offsetDate(10),
    },
  ];
}
